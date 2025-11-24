import { flexRender } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  TableHeader,
} from "../UI/ShadCN/table";
import ArrowDropDownSharp from "@mui/icons-material/ArrowDropDownSharp";
import ArrowDropUpSharp from "@mui/icons-material/ArrowDropUpSharp";
import Tooltip from "@mui/material/Tooltip";
import LinearProgress from "@mui/material/LinearProgress";
import React, { useMemo, useState } from "react";

// Remove memo wrapper and export directly
export const TableComponent = function TableComponent({
  table,
  handleRowClick,
  userRole,
  animationComplete,
  stats,
  statsLoading = false,
  containerWidth = 0,
  subscriptionType = "WMM",
  addedToday = false,
  isSmallHeight = false,
}) {
  const [showPerPage, setShowPerPage] = useState(false);
  const [visibleMetrics, setVisibleMetrics] = useState({
    HRG: false,
    FOM: false,
    CAL: false,
  });

  // Toggle metric visibility
  const handleMetricToggle = (metric) => {
    setVisibleMetrics((prev) => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  // Calculate responsive dimensions
  const isMobile = containerWidth > 0 && containerWidth < 640;
  const isTablet = containerWidth >= 640 && containerWidth < 1024;
  const isLaptop = containerWidth >= 1024 && containerWidth < 1440;

  // Get responsive text size class
  const getTextSizeClass = () => {
    if (isMobile) return "text-xs font-medium";
    if (isTablet) return "text-sm font-medium";
    if (isLaptop) return "text-base font-medium";
    return "text-base";
  };

  // Get responsive padding class
  const getPaddingClass = () => {
    if (isMobile) return "px-1 py-0.5";
    if (isTablet) return "px-2 py-1";
    return "px-4 py-2";
  };

  // Adjust max heights for scrollable areas based on container width and screen height
  const getMaxHeight = () => {
    if (isSmallHeight) return 60;
    if (isMobile) return 100;
    if (isTablet) return 120;
    return 150;
  };

  // Check if role contains WMM (either as a single role or part of a composite role)
  const hasWmmRole = userRole === "WMM" || userRole?.includes("WMM");

  // Client count display for roles that include WMM
  const clientCountDisplay = hasWmmRole ? (
    <span className="text-base mr-4 text-gray-800">
      Clients:{" "}
      <span className="font-bold">
        {Number(stats?.clientCount?.total || 0).toLocaleString()}
      </span>
    </span>
  ) : null;

  // Helper function to find metric by service and label
  const findMetric = (service, label = null) => {
    const serviceMetric = stats?.metrics?.find(
      (m) => m.service.toLowerCase() === service.toLowerCase()
    );
    if (!serviceMetric) return null;

    if (label && serviceMetric.metrics) {
      return serviceMetric.metrics.find((m) => m.label === label);
    }

    return serviceMetric;
  };

  // Clickable metric label component
  const MetricLabel = React.forwardRef(
    ({ metric, color, children, ...props }, ref) => (
      <span
        ref={ref}
        className={`font-medium cursor-pointer hover:underline ${
          visibleMetrics[metric] ? "font-bold" : "opacity-70"
        } ${color}`}
        onClick={(e) => {
          e.stopPropagation();
          handleMetricToggle(metric);
        }}
        title={
          visibleMetrics[metric]
            ? `Hide ${metric} details`
            : `Show ${metric} details`
        }
        {...props}
      >
        {children}
      </span>
    )
  );
  MetricLabel.displayName = "MetricLabel";

  // Simplified HRG FOM CAL display with clickable labels
  const renderHrgFomCalDisplay = () => {
    // Check if container is narrow (smaller desktop)
    const isNarrowDesktop = containerWidth > 0 && containerWidth < 1200;

    return (
      <div className="overflow-x-auto">
        <div
          className={`flex items-center gap-x-2 ${
            isNarrowDesktop ? "gap-y-1 text-xs" : "gap-x-4 text-sm"
          } bg-white min-w-max`}
        >
          {/* Clients Count - Always visible with per-page tooltip */}
          <div className="flex items-center">
            <Tooltip
              title={`Page: ${Number(
                stats.clientCount.page || 0
              ).toLocaleString()} | Filter: ${Number(
                stats.clientCount.total || 0
              ).toLocaleString()}`}
              arrow
            >
              <span className="font-medium text-gray-700 cursor-help">
                Clients: {Number(stats.clientCount.total || 0).toLocaleString()}
              </span>
            </Tooltip>
          </div>

          {/* HRG Section - Conditionally visible */}
          <div
            className={`flex items-center border-l border-gray-300 ${
              isNarrowDesktop ? "pl-2" : "pl-4"
            }`}
          >
            <Tooltip
              title={`Page: ${Number(
                stats?.serviceClientCounts?.hrgOnly?.page || 0
              ).toLocaleString()} | Total: ${Number(
                stats?.serviceClientCounts?.hrgOnly?.total || 0
              ).toLocaleString()}`}
              arrow
            >
              <span>
                {" "}
                {/* Wrap with a span that can hold ref */}
                <MetricLabel metric="HRG" color="text-blue-700">
                  HRG:{" "}
                  {Number(
                    stats?.serviceClientCounts?.hrgOnly?.total || 0
                  ).toLocaleString()}
                </MetricLabel>
              </span>
            </Tooltip>
            {visibleMetrics.HRG && (
              <span className="ml-1 flex items-center gap-2">
                <Tooltip
                  title={`${
                    findMetric("HRG")?.tooltip ||
                    "Totals from most recent records based on receive date"
                  }\nNon-numeric payments (invalid amounts) - Page: ${Number(
                    stats?.dataQuality?.hrg?.nonNumericPayments?.page || 0
                  ).toLocaleString()} | Total: ${Number(
                    stats?.dataQuality?.hrg?.nonNumericPayments?.total || 0
                  ).toLocaleString()}`}
                  arrow
                >
                  <span className="text-blue-700">
                    {Number(findMetric("HRG")?.total || 0).toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2 }
                    )}{" "}
                    {findMetric("HRG")?.unit}
                  </span>
                </Tooltip>
              </span>
            )}
          </div>

          {/* FOM Section - Conditionally visible */}
          <div
            className={`flex items-center border-l border-gray-300 ${
              isNarrowDesktop ? "pl-2" : "pl-4"
            }`}
          >
            <Tooltip
              title={`Page: ${Number(
                stats?.serviceClientCounts?.fomOnly?.page || 0
              ).toLocaleString()} | Total: ${Number(
                stats?.serviceClientCounts?.fomOnly?.total || 0
              ).toLocaleString()}`}
              arrow
            >
              <span>
                {" "}
                {/* Wrap with a span that can hold ref */}
                <MetricLabel metric="FOM" color="text-green-700">
                  FOM:{" "}
                  {Number(
                    stats?.serviceClientCounts?.fomOnly?.total || 0
                  ).toLocaleString()}
                </MetricLabel>
              </span>
            </Tooltip>
            {visibleMetrics.FOM && (
              <span className="ml-1 flex items-center gap-2">
                <Tooltip
                  title={`${
                    findMetric("FOM")?.tooltip ||
                    "Totals from most recent records based on receive date"
                  }\nNon-numeric payments (invalid amounts) - Page: ${Number(
                    stats?.dataQuality?.fom?.nonNumericPayments?.page || 0
                  ).toLocaleString()} | Total: ${Number(
                    stats?.dataQuality?.fom?.nonNumericPayments?.total || 0
                  ).toLocaleString()}`}
                  arrow
                >
                  <span className="text-green-700">
                    {Number(findMetric("FOM")?.total || 0).toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2 }
                    )}{" "}
                    {findMetric("FOM")?.unit}
                  </span>
                </Tooltip>
              </span>
            )}
          </div>

          {/* CAL Section - Conditionally visible */}
          <div
            className={`flex items-center border-l border-gray-300 ${
              isNarrowDesktop ? "pl-2" : "pl-4"
            }`}
          >
            <MetricLabel metric="CAL" color="text-amber-700">
              CAL
            </MetricLabel>
            {visibleMetrics.CAL && (
              <span className="ml-2 text-amber-700 flex items-center gap-3">
                <Tooltip
                  title={`Page: ${Number(
                    findMetric("CAL")?.metrics?.[0]?.page || 0
                  ).toLocaleString()} | Total: ${Number(
                    findMetric("CAL")?.metrics?.[0]?.total || 0
                  ).toLocaleString()}`}
                  arrow
                >
                  <span>
                    Qty:{" "}
                    {Number(
                      findMetric("CAL")?.metrics?.[0]?.total || 0
                    ).toLocaleString()}
                  </span>
                </Tooltip>
                <Tooltip
                  title={`Page: ${Number(
                    findMetric("CAL")?.metrics?.[1]?.page || 0
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })} | Total: ${Number(
                    findMetric("CAL")?.metrics?.[1]?.total || 0
                  ).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  arrow
                >
                  <span>
                    Sold:{" "}
                    {Number(
                      findMetric("CAL")?.metrics?.[1]?.total || 0
                    ).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {findMetric("CAL")?.metrics?.[1]?.unit}
                  </span>
                </Tooltip>
                <Tooltip
                  title={`Page: ${Number(
                    findMetric("CAL")?.metrics?.[2]?.page || 0
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })} | Total: ${Number(
                    findMetric("CAL")?.metrics?.[2]?.total || 0
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })} - Total Amount Paid. Non-numeric payments (invalid amounts) - Page: ${Number(
                    findMetric("CAL")?.metrics?.[4]?.page || 0
                  ).toLocaleString()} | Total: ${Number(
                    findMetric("CAL")?.metrics?.[4]?.total || 0
                  ).toLocaleString()}`}
                  arrow
                >
                  <span className="text-amber-700">
                    Paid:{" "}
                    {Number(
                      findMetric("CAL")?.metrics?.[2]?.total || 0
                    ).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {findMetric("CAL")?.metrics?.[2]?.unit}
                  </span>
                </Tooltip>
                <Tooltip
                  title={`Page: ${Number(
                    findMetric("CAL")?.metrics?.[3]?.page || 0
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })} | Total: ${Number(
                    findMetric("CAL")?.metrics?.[3]?.total || 0
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })} - Unpaid Amount = Expected - Paid`}
                  arrow
                >
                  <span className="text-red-600">
                    Balance:{" "}
                    {Number(
                      findMetric("CAL")?.metrics?.[3]?.total || 0
                    ).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {findMetric("CAL")?.metrics?.[3]?.unit}
                  </span>
                </Tooltip>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };
  // Memoize the label to prevent recalculation on every render
  const totalLabel = useMemo(() => {
    if (statsLoading) {
      return (
        <div className="w-full flex items-center justify-center py-2">
          {LinearProgress ? (
            <div className="w-1/2 min-w-[120px]">
              <LinearProgress />
            </div>
          ) : (
            <span>Loading...</span>
          )}
        </div>
      );
    }
    if (!stats) return <div></div>;

    // Admin: show a compact grid of per-page and total for all services
    if (userRole === "Admin") {
      const isNarrowDesktop = containerWidth > 0 && containerWidth < 1200;
      return (
        <div
          className={`px-2 py-1 ${
            isNarrowDesktop ? "text-xs" : "text-sm"
          } overflow-x-auto`}
        >
          <div
            className={`flex items-center ${
              isNarrowDesktop ? "gap-x-2" : "gap-x-4"
            } gap-y-2 p-1.5 bg-white border border-gray-200 min-w-max`}
          >
            {/* Clients Count */}
            <div className="flex items-center">
              <span className="font-medium text-gray-700">
                Clients: {Number(stats.clientCount.total || 0).toLocaleString()}
              </span>
            </div>

            {/* HRG Section */}
            <div className="flex items-center border-l border-gray-300 pl-4">
              <span className="font-medium text-blue-700">
                HRG:{" "}
                {Number(
                  stats?.serviceClientCounts?.hrgOnly?.total || 0
                ).toLocaleString()}{" "}
                •{" "}
                <Tooltip title={findMetric("HRG")?.tooltip} arrow>
                  <span>
                    {Number(findMetric("HRG")?.total || 0).toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2 }
                    )}{" "}
                    {findMetric("HRG")?.unit}
                  </span>
                </Tooltip>
              </span>
            </div>

            {/* FOM Section */}
            <div className="flex items-center border-l border-gray-300 pl-4">
              <span className="font-medium text-green-700">
                FOM:{" "}
                {Number(
                  stats?.serviceClientCounts?.fomOnly?.total || 0
                ).toLocaleString()}{" "}
                •{" "}
                <Tooltip title={findMetric("FOM")?.tooltip} arrow>
                  <span>
                    {Number(findMetric("FOM")?.total || 0).toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2 }
                    )}{" "}
                    {findMetric("FOM")?.unit}
                  </span>
                </Tooltip>
              </span>
            </div>

            {/* CAL Section */}
            <div className="flex items-center border-l border-gray-300 pl-4">
              <span className="font-medium text-amber-700">
                CAL:{" "}
                {Number(
                  findMetric("CAL")?.metrics?.[0]?.total || 0
                ).toLocaleString()}{" "}
                • Sold:{" "}
                {Number(
                  findMetric("CAL")?.metrics?.[1]?.total || 0
                ).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                {findMetric("CAL")?.metrics?.[1]?.unit} •{" "}
                <Tooltip title="Total Amount Paid" arrow>
                  <span>
                    Paid:{" "}
                    {Number(
                      findMetric("CAL")?.metrics?.[2]?.total || 0
                    ).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {findMetric("CAL")?.metrics?.[2]?.unit}
                  </span>
                </Tooltip>
                <span> • </span>
                <Tooltip title="Unpaid Amount = Expected - Paid" arrow>
                  <span className="text-red-600">
                    Balance:{" "}
                    {Number(
                      findMetric("CAL")?.metrics?.[3]?.total || 0
                    ).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {findMetric("CAL")?.metrics?.[3]?.unit}
                  </span>
                </Tooltip>
              </span>
            </div>

            {/* WMM Section */}
            <div className="flex items-center border-l border-gray-300 pl-4">
              <span className="font-medium text-gray-700">
                WMM:{" "}
                {Number(
                  stats?.serviceClientCounts?.wmm?.total || 0
                ).toLocaleString()}{" "}
                • {Number(findMetric("WMM")?.total || 0).toLocaleString()}{" "}
                copies
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Force WMM display if user only has WMM role
    if (userRole === "WMM") {
      const serviceKey = subscriptionType.toLowerCase();
      const serviceCounts =
        stats?.serviceClientCounts?.[serviceKey] ||
        stats?.serviceClientCounts?.wmm;
      const serviceMetric =
        findMetric(subscriptionType.toUpperCase()) || findMetric("WMM");

      return (
        <div className="flex flex-wrap px-2 py-1">
          {clientCountDisplay}
          <span
            className={`text-base ${
              subscriptionType === "Promo"
                ? "text-emerald-600"
                : subscriptionType === "Complimentary"
                ? "text-purple-600"
                : "text-blue-600"
            } font-medium ml-4`}
          >
            {subscriptionType} Clients:{" "}
            <span className="font-bold">
              {Number(serviceCounts?.total || 0).toLocaleString()}
            </span>
          </span>
          <span
            className={`text-base ${
              subscriptionType === "Promo"
                ? "text-emerald-600"
                : subscriptionType === "Complimentary"
                ? "text-purple-600"
                : "text-blue-600"
            } font-medium ml-4`}
          >
            Copies:{" "}
            <span className="font-bold">
              {Number(serviceMetric?.total || 0).toLocaleString()}
            </span>
          </span>
        </div>
      );
    }

    switch (userRole) {
      case "CAL": {
        const calMetrics = findMetric("CAL")?.metrics || [];
        const qtyMetric = calMetrics.find((m) => m.label === "Quantity");
        const amtMetric = calMetrics.find((m) => m.label === "Amount");
        const paymtMetric = calMetrics.find((m) => m.label === "Payments");
        const balanceMetric = calMetrics.find((m) => m.label === "Balance");
        const nonNumericMetric = calMetrics.find(
          (m) => m.label === "Non-numeric Payments"
        );

        return (
          <div className="flex flex-wrap justify-between px-2 py-1">
            <span className="text-sm sm:text-base">
              <span className="mr-2 sm:mr-4 text-gray-800 font-medium">
                Clients:{" "}
                <span className="font-bold">
                  {Number(stats.clientCount.total || 0).toLocaleString()}
                </span>
              </span>
              <span className="mr-2 sm:mr-4 text-gray-800 font-medium">
                Qty:{" "}
                <span className="font-bold">
                  {Number(qtyMetric?.total || 0).toLocaleString()}
                </span>
              </span>
              <span
                className="text-gray-800 font-medium"
                title="Total Amount Sold = Qty * Unit"
              >
                Expected:{" "}
                <span className="font-bold">
                  {Number(amtMetric?.total || 0).toLocaleString()}
                </span>{" "}
                {amtMetric?.unit}
              </span>
              <span className="ml-2 sm:ml-4 text-gray-800 font-medium">
                Paid:{" "}
                <Tooltip
                  title={`Total Amount Paid. Non-numeric payments (invalid amounts) - Total: ${Number(
                    nonNumericMetric?.total || 0
                  ).toLocaleString()}`}
                  arrow
                >
                  <span className="font-bold">
                    {Number(paymtMetric?.total || 0).toLocaleString()}
                  </span>
                </Tooltip>{" "}
                {paymtMetric?.unit}
              </span>
              <span className="ml-2 sm:ml-4 text-gray-800 font-medium">
                Balance:{" "}
                <Tooltip title="Unpaid Amount = Expected - Paid" arrow>
                  <span className="font-bold text-red-600">
                    {Number(balanceMetric?.total || 0).toLocaleString()}
                  </span>
                </Tooltip>{" "}
                {balanceMetric?.unit}
              </span>
            </span>
          </div>
        );
      }
      case "HRG": {
        const hrgMetric = findMetric("HRG");
        return (
          <div className="flex justify-between px-2 py-1">
            <span className="text-base text-blue-700 font-medium">
              Clients:{" "}
              <span className="font-bold">
                {Number(stats.clientCount.total || 0).toLocaleString()}
              </span>
              <span className="mx-4"></span>
              HRG Only Clients:{" "}
              <span className="font-bold">
                {Number(
                  stats?.serviceClientCounts?.hrgOnly?.total || 0
                ).toLocaleString()}
              </span>
              <span className="mx-4"></span>
              HRG Payment:{" "}
              <Tooltip
                title={`${
                  hrgMetric?.tooltip ||
                  "Totals from most recent records based on receive date"
                }\nNon-numeric payments (invalid amounts) - Total: ${Number(
                  stats?.dataQuality?.hrg?.nonNumericPayments?.total || 0
                ).toLocaleString()}`}
                arrow
              >
                <span className="font-bold">
                  {Number(hrgMetric?.total || 0).toLocaleString()}
                </span>
              </Tooltip>{" "}
              {hrgMetric?.unit}
            </span>
          </div>
        );
      }
      case "FOM": {
        const fomMetric = findMetric("FOM");
        return (
          <div className="flex justify-between px-2 py-1">
            <span className="text-base text-green-700 font-medium">
              Clients:{" "}
              <span className="font-bold">
                {Number(stats.clientCount.total || 0).toLocaleString()}
              </span>
              <span className="mx-4"></span>
              FOM Only Clients:{" "}
              <span className="font-bold">
                {Number(
                  stats?.serviceClientCounts?.fomOnly?.total || 0
                ).toLocaleString()}
              </span>
              <span className="mx-4"></span>
              FOM Payment:{" "}
              <Tooltip
                title={`${
                  fomMetric?.tooltip ||
                  "Totals from most recent records based on receive date"
                }\nNon-numeric payments (invalid amounts) - Total: ${Number(
                  stats?.dataQuality?.fom?.nonNumericPayments?.total || 0
                ).toLocaleString()}`}
                arrow
              >
                <span className="font-bold">
                  {Number(fomMetric?.total || 0).toLocaleString()}
                </span>
              </Tooltip>{" "}
              {fomMetric?.unit}
            </span>
          </div>
        );
      }
      case "HRG FOM CAL": {
        // Use the simplified HRG FOM CAL display with clickable labels
        return renderHrgFomCalDisplay();
      }
      case "WMM": {
        const wmmMetric = findMetric("WMM");
        return (
          <div className="flex flex-wrap px-2 py-1">
            {clientCountDisplay}
            <span
              className={`text-base ${
                subscriptionType === "Promo"
                  ? "text-emerald-600"
                  : subscriptionType === "Complimentary"
                  ? "text-purple-600"
                  : "text-blue-600"
              } font-medium ml-4`}
            >
              {subscriptionType} Clients:{" "}
              <span className="font-bold">
                {Number(
                  stats?.serviceClientCounts?.wmm?.total || 0
                ).toLocaleString()}
              </span>
            </span>
            <span
              className={`text-base ${
                subscriptionType === "Promo"
                  ? "text-emerald-600"
                  : subscriptionType === "Complimentary"
                  ? "text-purple-600"
                  : "text-blue-600"
              } font-medium ml-4`}
            >
              Copies:{" "}
              <span className="font-bold">
                {Number(wmmMetric?.total || 0).toLocaleString()}
              </span>
            </span>
          </div>
        );
      }
      default:
        return <div></div>;
    }
  }, [
    stats,
    userRole,
    hasWmmRole,
    clientCountDisplay,
    statsLoading,
    subscriptionType,
    visibleMetrics,
    renderHrgFomCalDisplay,
  ]);

  // Get header background color based on subscription type
  const getHeaderBackgroundColor = () => {
    switch (subscriptionType) {
      case "Promo":
        return "bg-emerald-600";
      case "Complimentary":
        return "bg-purple-600";
      default:
        return "bg-blue-600";
    }
  };

  // Get row colors based on subscription type
  const getRowColors = () => {
    switch (subscriptionType) {
      case "Promo":
        return {
          even: "even:bg-white",
          odd: "odd:bg-emerald-100",
          hover: "hover:bg-emerald-300",
        };
      case "Complimentary":
        return {
          even: "even:bg-white",
          odd: "odd:bg-purple-100",
          hover: "hover:bg-purple-200",
        };
      default: // WMM
        return {
          even: "even:bg-white",
          odd: "odd:bg-blue-100",
          hover: "hover:bg-blue-200",
        };
    }
  };

  const handleCellClick = (event, row, cell) => {
    if (cell.column.id === "select") {
      event.stopPropagation();
      return;
    }
    handleRowClick(event, row);
  };

  return (
    <div>
      <Table>
        <TableHeader className="sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  onClick={(e) => {
                    e.preventDefault();
                    header.column.toggleSorting();
                  }}
                  className={`${getHeaderBackgroundColor()} text-white font-bold ${getTextSizeClass()} sticky top-0 whitespace-nowrap cursor-pointer ${getPaddingClass()}`}
                  style={{
                    position: "relative",
                    height: isMobile ? "36px" : isTablet ? "44px" : "50px",
                  }}
                >
                  <div className="flex items-center justify-between">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    <span className="ml-2">
                      {header.column.getIsSorted() === "asc" && (
                        <ArrowDropUpSharp />
                      )}
                      {header.column.getIsSorted() === "desc" && (
                        <ArrowDropDownSharp />
                      )}
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row, rowIndex) => {
              // Add isFiltered flag to the row's original data if stats indicate filtering
              if (stats?.clientCount) {
                row.original.isFiltered =
                  stats.clientCount.total !== stats.clientCount.page;
              }

              // Determine if this row contains any subscription record that was
              // added/updated today. We check the common subscription containers
              // (wmmData, promoData, compData) and look for adddate/addedAt/updatedAt
              const todayIso = new Date().toISOString().slice(0, 10);
              const hasTodaySubscription = (() => {
                try {
                  const subsKeys = ["wmmData", "promoData", "compData"];
                  for (const key of subsKeys) {
                    const sdata = row.original?.[key];
                    if (!sdata) continue;
                    const records =
                      sdata.filteredRecords ||
                      sdata.matchedRecords ||
                      sdata.records ||
                      [];
                    if (!Array.isArray(records)) continue;
                    for (const rec of records) {
                      const add =
                        rec?.adddate ||
                        rec?.addedAt ||
                        rec?.updatedAt ||
                        rec?.subsdate;
                      if (!add) continue;
                      const addDatePart =
                        typeof add === "string"
                          ? add.split(" ")[0]
                          : new Date(add).toISOString().slice(0, 10);
                      if (addDatePart === todayIso) return true;
                    }
                  }
                } catch (e) {
                  // Ignore any parsing errors and treat as not today
                }
                return false;
              })();

              const rowColors = getRowColors();
              const isMostRecentRow = addedToday && hasTodaySubscription;

              return (
                <TableRow
                  key={`${row.id}-${rowIndex}`}
                  className={`${
                    isMostRecentRow
                      ? "bg-green-100"
                      : `${rowColors.even} ${rowColors.odd}`
                  } ${
                    isMostRecentRow ? "hover:bg-green-200" : rowColors.hover
                  } cursor-pointer border-b border-gray-200 last:border-none transition-all duration-300 ease-in-out ${getTextSizeClass()} ${
                    animationComplete
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-2"
                  }`}
                  style={{
                    transitionDelay: `${rowIndex * 40}ms`,
                    minHeight: isMobile ? "36px" : isTablet ? "44px" : "50px",
                  }}
                >
                  {row.getVisibleCells().map((cell) => {
                    const cellWidth = cell.column.columnDef.size;
                    return (
                      <TableCell
                        key={`${cell.id}-${rowIndex}`}
                        style={{
                          width: cellWidth,
                          maxWidth: cell.column.columnDef.maxSize
                            ? `${cell.column.columnDef.maxSize}px`
                            : cellWidth
                            ? `${cellWidth}px`
                            : "auto",
                          minWidth: cell.column.columnDef.minSize
                            ? `${cell.column.columnDef.minSize}px`
                            : cellWidth
                            ? `${cellWidth * 0.7}px`
                            : "auto",
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          minHeight: isMobile
                            ? "36px"
                            : isTablet
                            ? "44px"
                            : "52px",
                        }}
                        className={`${
                          cell.column.id === "select"
                            ? "p-0"
                            : getPaddingClass()
                        } overflow-visible`}
                        onClick={(event) => handleCellClick(event, row, cell)}
                      >
                        {cell.column.id === "Client Name" ? (
                          <div style={{ textAlign: "left" }}>
                            {cell
                              .getValue()
                              .split("<br>")
                              .map((part, index) => {
                                if (part.startsWith("Spack: ")) {
                                  return (
                                    <div key={index} className="mt-1">
                                      <span
                                        className={`px-2 py-0.5 text-sm font-medium bg-amber-100 text-amber-800`}
                                      >
                                        {part.substring(6)}{" "}
                                        {/* Remove "Spack: " prefix */}
                                      </span>
                                    </div>
                                  );
                                } else if (part.startsWith("RTS: ")) {
                                  const rtsText = part.substring(5); // Remove "RTS: " prefix
                                  const isMaxRTS = rtsText.includes("MAX RTS");
                                  return (
                                    <div key={index} className="mt-1">
                                      <span
                                        className={`px-2 py-0.5 text-sm font-medium ${
                                          isMaxRTS
                                            ? "bg-red-100 text-red-800"
                                            : "bg-orange-100 text-orange-800"
                                        }`}
                                      >
                                        {rtsText}
                                      </span>
                                    </div>
                                  );
                                } else if (part.startsWith("Donor: ")) {
                                  return (
                                    <div key={index} className="mt-1">
                                      <span
                                        className={`px-2 py-0.5 text-sm font-medium bg-lime-100 text-lime-800`}
                                      >
                                        {part.substring(7)}{" "}
                                        {/* Remove "Donor: " prefix */}
                                      </span>
                                    </div>
                                  );
                                } else if (part.startsWith("Name: ")) {
                                  const name = part.substring(6); // Remove "Name: " prefix
                                  const hasCompany = cell
                                    .getValue()
                                    .split("<br>")
                                    .some((p) => p.startsWith("Company: "));
                                  return (
                                    <div
                                      key={index}
                                      className={`${
                                        name !== "No Name"
                                          ? "font-bold text-base"
                                          : "text-base"
                                      }`}
                                    >
                                      {name}
                                    </div>
                                  );
                                } else if (part.startsWith("Company: ")) {
                                  const hasName = cell
                                    .getValue()
                                    .split("<br>")
                                    .some(
                                      (p) =>
                                        p.startsWith("Name: ") &&
                                        !p.includes("No Name")
                                    );
                                  return (
                                    <div
                                      key={index}
                                      className={`${
                                        hasName
                                          ? "text-sm italic"
                                          : "font-bold text-base"
                                      }`}
                                    >
                                      {part.substring(9)}{" "}
                                      {/* Remove "Company: " prefix */}
                                    </div>
                                  );
                                } else if (
                                  part.startsWith("Type: ") ||
                                  part.startsWith("Group: ")
                                ) {
                                  return (
                                    <div
                                      key={index}
                                      className="text-gray-600 font-medium"
                                    >
                                      {part}
                                    </div>
                                  );
                                }
                                return null;
                              })}
                          </div>
                        ) : cell.column.id === "Address" ? (
                          <div style={{ textAlign: "left" }}>
                            <div>{cell.getValue().split("<br>")[0]}</div>
                            {cell.getValue().split("<br>")[1] && (
                              <div className="font-bold">
                                {cell
                                  .getValue()
                                  .split("<br>")[1]
                                  .replace(/<\/?strong>/g, "")}
                              </div>
                            )}
                          </div>
                        ) : cell.column.id === "Contact Info" ? (
                          <div>{cell.getValue()}</div>
                        ) : cell.column.id === "Added Info" ? (
                          <div style={{ textAlign: "left" }}>
                            <div>
                              <strong>By:</strong>{" "}
                              {cell.getValue().split(", ")[0].split(": ")[1]}
                            </div>
                            <div>
                              <strong>Date:</strong>{" "}
                              {cell.getValue().split(", ")[1].split(": ")[1]}
                            </div>
                          </div>
                        ) : cell.column.id === "Subscription" &&
                          Array.isArray(cell.getValue()) ? (
                          <ul
                            className={`max-w-[450px] ${
                              isSmallHeight
                                ? "overflow-y-auto"
                                : "overflow-y-auto"
                            } scrollbar-hide text-xs sm:text-sm md:text-base`}
                            style={{
                              maxHeight: `${getMaxHeight()}px`,
                              overflowY: "auto",
                            }}
                          >
                            {cell.getValue().length > 0 ? (
                              cell.getValue().map((sub, index) => {
                                // Get status color class
                                const statusClass =
                                  sub.status === "expired"
                                    ? "text-red-600 font-bold"
                                    : sub.status === "expiring-soon"
                                    ? "text-amber-600 font-bold"
                                    : sub.status === "active"
                                    ? "text-green-600 font-medium"
                                    : "text-gray-700";

                                const statusIndicator =
                                  sub.status === "active"
                                    ? "🟢 "
                                    : sub.status === "expired"
                                    ? "🔴 "
                                    : "⚠️ ";

                                const isSubAddedToday = (() => {
                                  try {
                                    if (!sub?.adddate) return false;
                                    const addPart = String(sub.adddate).split(
                                      " "
                                    )[0];
                                    return addPart === todayIso;
                                  } catch (e) {
                                    return false;
                                  }
                                })();

                                return (
                                  <li
                                    key={index}
                                    className={`mb-1 ${
                                      isSubAddedToday && addedToday
                                        ? "bg-green-50 border border-green-200 rounded p-1"
                                        : ""
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <div className="flex items-center justify-between">
                                        <span className={statusClass}>
                                          {statusIndicator}
                                          <strong>{sub.subsclass}</strong>:{" "}
                                          {sub.subsdate} - {sub.enddate}, Cps:{" "}
                                          {sub.copies}
                                        </span>
                                        {isSubAddedToday && addedToday && (
                                          <span className="text-xs ml-2 text-green-800 font-semibold">
                                            New
                                          </span>
                                        )}
                                      </div>
                                      {(sub.paymtref || sub.paymtamt) && (
                                        <div className="text-xs ml-4 text-gray-600">
                                          {sub.paymtref && (
                                            <span>Ref: {sub.paymtref}</span>
                                          )}
                                          {sub.paymtref && sub.paymtamt && (
                                            <span> • </span>
                                          )}
                                          {sub.paymtamt && (
                                            <span>Amt: {sub.paymtamt}</span>
                                          )}
                                        </div>
                                      )}
                                      {index === 0 && (
                                        <div className="text-xs ml-4 mt-1 flex items-center gap-2">
                                          {sub.calendar ? (
                                            <span className="text-white bg-orange-400 p-1 rounded-md font-medium">
                                              Calendar ✓
                                            </span>
                                          ) : (
                                            <span className="text-gray-500 bg-gray-100 p-1 rounded-md">
                                              No Calendar
                                            </span>
                                          )}
                                          {sub.referralid && (
                                            <span className="text-sky-900 bg-sky-200 p-1 rounded-md font-medium">
                                              Referral ID: {sub.referralid}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </li>
                                );
                              })
                            ) : (
                              <li>No subscription data</li>
                            )}
                          </ul>
                        ) : cell.column.id === "HRG Data" &&
                          Array.isArray(cell.getValue()) ? (
                          <div
                            className="w-full overflow-y-auto text-xs sm:text-sm md:text-base"
                            style={{
                              maxHeight: `${getMaxHeight()}px`,
                              overflowY: "auto",
                            }}
                          >
                            {cell.getValue().length > 0 ? (
                              <>
                                {/* Add status indicator for latest record */}
                                <div className="flex items-center gap-2 mb-2">
                                  <span
                                    className={
                                      cell.getValue()[0].status === "Active"
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }
                                  >
                                    {cell.getValue()[0].status === "Active"
                                      ? "🟢"
                                      : "🔴"}
                                  </span>
                                  <span
                                    className={
                                      cell.getValue()[0].status === "Active"
                                        ? "text-green-600 font-medium"
                                        : "text-red-600 font-medium"
                                    }
                                  >
                                    {cell.getValue()[0].status}
                                  </span>
                                </div>
                                {/* Existing HRG data display */}
                                {cell.getValue().map((hrg, index) => (
                                  <div
                                    key={index}
                                    className="mb-2 pb-2 border-b border-gray-900 last:border-b-0"
                                  >
                                    <div className="flex flex-wrap items-center">
                                      <div className="font-bold font-xs mr-1">
                                        Campaign Date: {hrg.campaigndate}
                                      </div>
                                      <div className="font-xs mr-1">
                                        Php {hrg.paymtamt} - Ref: #
                                        {hrg.paymtref}
                                      </div>
                                      <div className="font-xs mr-1">
                                        Receive Date: {hrg.recvdate}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </>
                            ) : (
                              <div className="text-gray-500 italic">
                                No HRG data
                              </div>
                            )}
                          </div>
                        ) : cell.column.id === "FOM Data" &&
                          Array.isArray(cell.getValue()) ? (
                          <div
                            className="w-full overflow-y-auto text-xs sm:text-sm md:text-base"
                            style={{
                              maxHeight: `${getMaxHeight()}px`,
                              overflowY: "auto",
                            }}
                          >
                            {cell.getValue().length > 0 ? (
                              <>
                                {/* Add status indicator for latest record */}
                                <div className="flex items-center gap-2 mb-2">
                                  <span
                                    className={
                                      cell.getValue()[0].status === "Active"
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }
                                  >
                                    {cell.getValue()[0].status === "Active"
                                      ? "🟢"
                                      : "🔴"}
                                  </span>
                                  <span
                                    className={
                                      cell.getValue()[0].status === "Active"
                                        ? "text-green-600 font-medium"
                                        : "text-red-600 font-medium"
                                    }
                                  >
                                    {cell.getValue()[0].status}
                                  </span>
                                </div>
                                {/* Existing FOM data display */}
                                {cell.getValue().map((fom, index) => (
                                  <div
                                    key={index}
                                    className="mb-2 pb-2 border-b border-gray-900 last:border-b-0"
                                  >
                                    <div className="flex flex-wrap items-center">
                                      <div className="font-xs mr-1">
                                        Receive Date: {fom.recvdate}
                                      </div>
                                      <div className="font-xs mr-1">
                                        Php {fom.paymtamt} - Ref: #
                                        {fom.paymtref}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </>
                            ) : (
                              <div className="text-gray-500 italic">
                                No FOM data
                              </div>
                            )}
                          </div>
                        ) : cell.column.id === "CAL Data" &&
                          Array.isArray(cell.getValue()) ? (
                          <div
                            className="w-full overflow-y-auto text-xs sm:text-sm md:text-base"
                            style={{
                              maxHeight: `${getMaxHeight()}px`,
                              overflowY: "auto",
                            }}
                          >
                            {cell.getValue().length > 0 ? (
                              <>
                                {cell.getValue().map((cal, index) => (
                                  <div
                                    key={index}
                                    className="mb-2 pb-2 border-b border-gray-900 last:border-b-0"
                                  >
                                    <div className="flex flex-wrap items-center">
                                      <span className="font-medium mr-1">
                                        {cal.recvdate} - {cal.caltype}
                                      </span>
                                      <span className="mr-1">
                                        Qty: {cal.calqty} x Cost: {cal.unit} ={" "}
                                        {(
                                          parseFloat(cal.calqty || 0) *
                                          parseFloat(
                                            (cal.unit || "0")
                                              .toString()
                                              .replace(/[^\d.-]/g, "")
                                          )
                                        ).toLocaleString()}
                                      </span>
                                      <span>
                                        Ref: #{cal.paymtref} - {cal.paymtform}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </>
                            ) : (
                              <div className="text-gray-500 italic">
                                No CAL data
                              </div>
                            )}
                          </div>
                        ) : cell.column.id === "Services" &&
                          Array.isArray(cell.getValue()) ? (
                          <ul className="text-xs sm:text-sm md:text-base">
                            {cell.getValue().map((service, index) => (
                              <li
                                key={index}
                                style={{
                                  textTransform: "uppercase",
                                }}
                              >
                                <strong>{service}</strong>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={table.getVisibleLeafColumns().length}
                className={`text-center ${getTextSizeClass()} bg-white`}
                style={{
                  height: isMobile ? "36px" : isTablet ? "44px" : "52px",
                }}
              >
                No data
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <tfoot>
          <TableRow>
            <TableCell
              colSpan={table.getVisibleLeafColumns().length}
              className={`sticky bottom-0 bg-white ${getTextSizeClass()} font-bold transition-opacity duration-300 ease-in-out ${
                animationComplete ? "opacity-100" : "opacity-0"
              }`}
              style={{
                transitionDelay: `${
                  table.getRowModel().rows.length * 40 + 100
                }ms`,
                height: isMobile ? "28px" : isTablet ? "32px" : "38px",
              }}
            >
              {totalLabel}
            </TableCell>
          </TableRow>
        </tfoot>
      </Table>
    </div>
  );
};
