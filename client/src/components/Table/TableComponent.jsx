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
import { useMemo } from "react";

// Remove memo wrapper and export directly
export const TableComponent = function TableComponent({
  table,
  handleRowClick,
  userRole,
  animationComplete,
  stats, // New single prop for all statistics
  statsLoading = false,
  containerWidth = 0,
}) {
  // Calculate responsive dimensions
  const isMobile = containerWidth > 0 && containerWidth < 640;
  const isTablet = containerWidth >= 640 && containerWidth < 1024;
  
  // Adjust max heights for scrollable areas based on container width
  const getMaxHeight = () => {
    if (isMobile) return 100;
    if (isTablet) return 120;
    return 150;
  };

  // Check if role contains WMM (either as a single role or part of a composite role)
  const hasWmmRole = userRole === "WMM" || userRole?.includes("WMM");

  // Client count display for roles that include WMM
  const clientCountDisplay = hasWmmRole ? (
    <span className="text-base mr-4 text-gray-800">
      Clients Total:{" "}
      <span className="font-bold">
        {Number(stats?.clientCount?.total || 0).toLocaleString()}
      </span>{" "}
    </span>
  ) : null;

  // Helper function to find metric by service and label
  const findMetric = (service, label = null) => {
    const serviceMetric = stats?.metrics?.find(m => m.service === service);
    if (!serviceMetric) return null;
    
    if (label && serviceMetric.metrics) {
      return serviceMetric.metrics.find(m => m.label === label);
    }
    
    return serviceMetric;
  };

  // Memoize the label to prevent recalculation on every render
  const totalLabel = useMemo(() => {
    if (statsLoading) {
      // Try to use Material UI LinearProgress, fallback to text
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
      return (
        <div className="px-2 py-1 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-1.5 bg-white border border-gray-200">
            {/* Clients Count */}
            <div className="flex items-center">
              <span className="font-medium text-gray-700">
                Clients: {Number(stats.clientCount.page || 0).toLocaleString()} / {Number(stats.clientCount.total || 0).toLocaleString()}
              </span>
            </div>

            {/* HRG Section */}
            <div className="flex items-center border-l border-gray-300 pl-4">
              <span className="font-medium text-blue-700">
                HRG: {Number(stats?.serviceClientCounts?.hrgOnly?.page || 0).toLocaleString()} / {Number(stats?.serviceClientCounts?.hrgOnly?.total || 0).toLocaleString()} •{" "}
                <Tooltip title={findMetric('HRG')?.tooltip} arrow>
                  <span>
                    {Number(findMetric('HRG')?.page || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} {findMetric('HRG')?.unit}
                  </span>
                </Tooltip>
              </span>
            </div>

            {/* FOM Section */}
            <div className="flex items-center border-l border-gray-300 pl-4">
              <span className="font-medium text-green-700">
                FOM: {Number(stats?.serviceClientCounts?.fomOnly?.page || 0).toLocaleString()} / {Number(stats?.serviceClientCounts?.fomOnly?.total || 0).toLocaleString()} •{" "}
                <Tooltip title={findMetric('FOM')?.tooltip} arrow>
                  <span>
                    {Number(findMetric('FOM')?.page || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} {findMetric('FOM')?.unit}
                  </span>
                </Tooltip>
              </span>
            </div>

            {/* CAL Section */}
            <div className="flex items-center border-l border-gray-300 pl-4">
              <span className="font-medium text-amber-700">
                CAL: {findMetric('CAL')?.currentCalType} • {Number(findMetric('CAL')?.metrics?.[0]?.page || 0).toLocaleString()} / {Number(findMetric('CAL')?.metrics?.[0]?.total || 0).toLocaleString()} •{" "}
                Sold: {Number(findMetric('CAL')?.metrics?.[1]?.page || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} / {Number(findMetric('CAL')?.metrics?.[1]?.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} {findMetric('CAL')?.metrics?.[1]?.unit} •{" "}
                <Tooltip title={findMetric('CAL')?.metrics?.[2]?.tooltip} arrow>
                  <span>
                    Paid: {Number(findMetric('CAL')?.metrics?.[2]?.page || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} / {Number(findMetric('CAL')?.metrics?.[2]?.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} {findMetric('CAL')?.metrics?.[2]?.unit}
                  </span>
                </Tooltip>
                <span> • </span>
                <Tooltip title={findMetric('CAL')?.metrics?.[3]?.tooltip} arrow>
                  <span className="text-red-600">
                    Balance: {Number(findMetric('CAL')?.metrics?.[3]?.page || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} / {Number(findMetric('CAL')?.metrics?.[3]?.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} {findMetric('CAL')?.metrics?.[3]?.unit}
                  </span>
                </Tooltip>
              </span>
            </div>

            {/* WMM Section */}
            <div className="flex items-center border-l border-gray-300 pl-4">
              <span className="font-medium text-gray-700">
                WMM: {Number(stats?.serviceClientCounts?.wmm?.page || 0).toLocaleString()} / {Number(stats?.serviceClientCounts?.wmm?.total || 0).toLocaleString()} •{" "}
                {Number(findMetric('WMM')?.page || 0).toLocaleString()} copies
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Force WMM display if user only has WMM role
    if (userRole === "WMM") {
      const wmmMetric = findMetric('WMM');
      return (
        <div className="flex flex-wrap">
          {clientCountDisplay}
          <span className="text-base text-blue-700 font-medium ml-4">
            WMM Clients:{" "}
            <span className="font-bold">
              {Number(stats?.serviceClientCounts?.wmm?.page || 0).toLocaleString()}
            </span>{" "}
            <span className="text-gray-500 text-xs">(Page)</span> /{" "}
            <span className="font-bold">
              {Number(stats?.serviceClientCounts?.wmm?.total || 0).toLocaleString()}
            </span>{" "}
            <span className="text-gray-500 text-xs">(Filter)</span>
          </span>
          <span className="text-base text-blue-700 font-medium ml-4">
            Copies:{" "}
            <span className="font-bold">
              {Number(wmmMetric?.page || 0).toLocaleString()}
            </span>{" "}
            <span className="text-gray-500 text-xs">(Page)</span> /{" "}
            <span className="font-bold">
              {Number(wmmMetric?.total || 0).toLocaleString()}
            </span>{" "}
            <span className="text-gray-500 text-xs">(Filter)</span>
          </span>
        </div>
      );
    }

    switch (userRole) {
      case "CAL": {
        const calMetrics = findMetric('CAL')?.metrics || [];
        const qtyMetric = calMetrics.find(m => m.label === 'Quantity');
        const amtMetric = calMetrics.find(m => m.label === 'Amount');
        const paymtMetric = calMetrics.find(m => m.label === 'Payments');
        const balanceMetric = calMetrics.find(m => m.label === 'Balance');
        const nonNumericMetric = calMetrics.find(m => m.label === 'Non-numeric Payments');
        
        return (
          <div className="flex flex-wrap justify-between px-2 py-1">
            <span className="text-sm sm:text-base">
              <span className="mr-2 sm:mr-4 text-gray-800 font-medium">
                Clients:{" "}
                <span className="font-bold">
                  {Number(stats.clientCount.page || 0).toLocaleString()}
                </span>{" "}
                <span className="text-gray-500 text-xs">(Page)</span> /{" "}
                <span className="font-bold">
                  {Number(stats.clientCount.total || 0).toLocaleString()}
                </span>{" "}
                <span className="text-gray-500 text-xs">(Filter)</span>
              </span>
              <span className="mr-2 sm:mr-4 text-gray-800 font-medium">
                Calendar Type: <span className="font-bold">{findMetric('CAL')?.currentCalType || 'N/A'}</span>
              </span>
              <span className="mr-2 sm:mr-4 text-gray-800 font-medium">
                Qty:{" "}
                <span className="font-bold">
                  {Number(qtyMetric?.page || 0).toLocaleString()}
                </span>{" "}
                <span className="text-gray-500 text-xs">(Page)</span> /{" "}
                <span className="font-bold">
                  {Number(qtyMetric?.total || 0).toLocaleString()}
                </span>{" "}
                <span className="text-gray-500 text-xs">(Total)</span>
              </span>
              <span className="text-gray-800 font-medium">
                Expected:{" "}
                <span className="font-bold">
                  {Number(amtMetric?.page || 0).toLocaleString()}
                </span>{" "}
                <span className="text-gray-500 text-xs">(Page)</span> /{" "}
                <span className="font-bold">
                  {Number(amtMetric?.total || 0).toLocaleString()}
                </span>{" "}
                <span className="text-gray-500 text-xs">(Total)</span> {amtMetric?.unit}
              </span>
              <span className="ml-2 sm:ml-4 text-gray-800 font-medium">
                Paid:{" "}
                <Tooltip title={paymtMetric?.tooltip} arrow>
                  <span className="font-bold">
                    {Number(paymtMetric?.page || 0).toLocaleString()}
                  </span>
                </Tooltip>{" "}
                <span className="text-gray-500 text-xs">(Page)</span> /{" "}
                <Tooltip title={paymtMetric?.tooltip} arrow>
                  <span className="font-bold">
                    {Number(paymtMetric?.total || 0).toLocaleString()}
                  </span>
                </Tooltip>{" "}
                <span className="text-gray-500 text-xs">(Total)</span> {paymtMetric?.unit}
              </span>
              <span className="ml-2 sm:ml-4 text-gray-800 font-medium">
                Balance:{" "}
                <Tooltip title={balanceMetric?.tooltip} arrow>
                  <span className="font-bold text-red-600">
                    {Number(balanceMetric?.page || 0).toLocaleString()}
                  </span>
                </Tooltip>{" "}
                <span className="text-gray-500 text-xs">(Page)</span> /{" "}
                <Tooltip title={balanceMetric?.tooltip} arrow>
                  <span className="font-bold text-red-600">
                    {Number(balanceMetric?.total || 0).toLocaleString()}
                  </span>
                </Tooltip>{" "}
                <span className="text-gray-500 text-xs">(Total)</span> {balanceMetric?.unit}
              </span>
              <span className="ml-2 sm:ml-4 text-gray-800 font-medium">
                Non-numeric:{" "}
                <Tooltip title={nonNumericMetric?.tooltip} arrow>
                  <span className="font-bold text-amber-600">
                    {Number(nonNumericMetric?.page || 0).toLocaleString()}
                  </span>
                </Tooltip>{" "}
                <span className="text-gray-500 text-xs">(Page)</span> /{" "}
                <Tooltip title={nonNumericMetric?.tooltip} arrow>
                  <span className="font-bold text-amber-600">
                    {Number(nonNumericMetric?.total || 0).toLocaleString()}
                  </span>
                </Tooltip>{" "}
                <span className="text-gray-500 text-xs">(Total)</span>
              </span>
            </span>
          </div>
        );
      }
      case "HRG": {
        const hrgMetric = findMetric('HRG');
        return (
          <div className="flex justify-between px-2 py-1">
            <span className="text-base text-blue-700 font-medium">
              Clients:{" "}
              <span className="font-bold">
                {Number(stats.clientCount.page || 0).toLocaleString()}
              </span>{" "}
              <span className="text-gray-500 text-xs">(Page)</span> /{" "}
              <span className="font-bold">
                {Number(stats.clientCount.total || 0).toLocaleString()}
              </span>{" "}
              <span className="text-gray-500 text-xs">(Total)</span>
              <span className="mx-4"></span>
              HRG Only Clients:{" "}
              <span className="font-bold">
                {Number(stats?.serviceClientCounts?.hrgOnly?.page || 0).toLocaleString()}
              </span>{" "}
              <span className="text-gray-500 text-xs">(Page)</span> /{" "}
              <span className="font-bold">
                {Number(stats?.serviceClientCounts?.hrgOnly?.total || 0).toLocaleString()}
              </span>{" "}
              <span className="text-gray-500 text-xs">(Total)</span>
              <span className="mx-4"></span>
              HRG Payment:{" "}
              <Tooltip title={hrgMetric?.tooltip} arrow>
                <span className="font-bold">
                  {Number(hrgMetric?.page || 0).toLocaleString()}
                </span>
              </Tooltip>{" "}
              <span className="text-gray-500 text-xs">(Page)</span> /{" "}
              <Tooltip title={hrgMetric?.tooltip} arrow>
                <span className="font-bold">
                  {Number(hrgMetric?.total || 0).toLocaleString()}
                </span>
              </Tooltip>{" "}
              <span className="text-gray-500 text-xs">(Total)</span> {hrgMetric?.unit}
              <span className="mx-4"></span>
              Non-numeric:{" "}
              <Tooltip title="Number of records with non-numeric payment amounts" arrow>
                <span className="font-bold text-amber-600">
                  {Number(stats?.dataQuality?.hrg?.nonNumericPayments?.page || 0).toLocaleString()}
                </span>
              </Tooltip>{" "}
              <span className="text-gray-500 text-xs">(Page)</span> /{" "}
              <Tooltip title="Number of records with non-numeric payment amounts" arrow>
                <span className="font-bold text-amber-600">
                  {Number(stats?.dataQuality?.hrg?.nonNumericPayments?.total || 0).toLocaleString()}
                </span>
              </Tooltip>{" "}
              <span className="text-gray-500 text-xs">(Total)</span>
            </span>
          </div>
        );
      }
      case "FOM": {
        const fomMetric = findMetric('FOM');
        return (
          <div className="flex justify-between px-2 py-1">
            <span className="text-base text-green-700 font-medium">
              Clients:{" "}
              <span className="font-bold">
                {Number(stats.clientCount.page || 0).toLocaleString()}
              </span>{" "}
              <span className="text-gray-500 text-xs">(Page)</span> /{" "}
              <span className="font-bold">
                {Number(stats.clientCount.total || 0).toLocaleString()}
              </span>{" "}
              <span className="text-gray-500 text-xs">(Total)</span>
              <span className="mx-4"></span>
              FOM Only Clients:{" "}
              <span className="font-bold">
                {Number(stats?.serviceClientCounts?.fomOnly?.page || 0).toLocaleString()}
              </span>{" "}
              <span className="text-gray-500 text-xs">(Page)</span> /{" "}
              <span className="font-bold">
                {Number(stats?.serviceClientCounts?.fomOnly?.total || 0).toLocaleString()}
              </span>{" "}
              <span className="text-gray-500 text-xs">(Total)</span>
              <span className="mx-4"></span>
              FOM Payment:{" "}
              <Tooltip title={fomMetric?.tooltip} arrow>
                <span className="font-bold">
                  {Number(fomMetric?.page || 0).toLocaleString()}
                </span>
              </Tooltip>{" "}
              <span className="text-gray-500 text-xs">(Page)</span> /{" "}
              <Tooltip title={fomMetric?.tooltip} arrow>
                <span className="font-bold">
                  {Number(fomMetric?.total || 0).toLocaleString()}
                </span>
              </Tooltip>{" "}
              <span className="text-gray-500 text-xs">(Total)</span> {fomMetric?.unit}
              <span className="mx-4"></span>
              Non-numeric:{" "}
              <Tooltip title="Number of records with non-numeric payment amounts" arrow>
                <span className="font-bold text-amber-600">
                  {Number(stats?.dataQuality?.fom?.nonNumericPayments?.page || 0).toLocaleString()}
                </span>
              </Tooltip>{" "}
              <span className="text-gray-500 text-xs">(Page)</span> /{" "}
              <Tooltip title="Number of records with non-numeric payment amounts" arrow>
                <span className="font-bold text-amber-600">
                  {Number(stats?.dataQuality?.fom?.nonNumericPayments?.total || 0).toLocaleString()}
                </span>
              </Tooltip>{" "}
              <span className="text-gray-500 text-xs">(Total)</span>
            </span>
          </div>
        );
      }
      case "HRG FOM CAL": {
        // If the user has WMM role but is seeing HRG FOM CAL display, show the WMM section first
        if (hasWmmRole) {
          const wmmMetric = findMetric('WMM');
          return (
            <div className="px-2 py-1 text-xs">
              {/* WMM Section */}
              <div className="mb-1.5">
                {clientCountDisplay}
                <span className="text-base ml-4 text-gray-800 font-medium">
                  Copies:{" "}
                  <span className="font-bold">
                    {Number(wmmMetric?.page || 0).toLocaleString()}
                  </span>{" "}
                  <span className="text-gray-500 text-xs">(Page)</span> /{" "}
                  <span className="font-bold">
                    {Number(wmmMetric?.total || 0).toLocaleString()}
                  </span>{" "}
                  <span className="text-gray-500 text-xs">(Filter)</span>
                </span>
              </div>

              {/* Standard HRG FOM CAL display */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-1.5 bg-white border border-gray-200">
                {/* Clients Count */}
                <div className="flex items-center">
                  <span className="font-medium text-gray-700">
                    Clients: {Number(stats.clientCount.page || 0).toLocaleString()} / {Number(stats.clientCount.total || 0).toLocaleString()}
                  </span>
                </div>

                {/* HRG Section */}
                <div className="flex items-center border-l border-gray-300 pl-4">
                  <span className="font-medium text-blue-700">
                    HRG: {Number(stats?.serviceClientCounts?.hrgOnly?.page || 0).toLocaleString()} / {Number(stats?.serviceClientCounts?.hrgOnly?.total || 0).toLocaleString()} •{" "}
                    <Tooltip title={findMetric('HRG')?.tooltip} arrow>
                      <span>
                        {Number(findMetric('HRG')?.page || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} {findMetric('HRG')?.unit}
                      </span>
                    </Tooltip>
                  </span>
                </div>

                {/* FOM Section */}
                <div className="flex items-center border-l border-gray-300 pl-4">
                  <span className="font-medium text-green-700">
                    FOM: {Number(stats?.serviceClientCounts?.fomOnly?.page || 0).toLocaleString()} / {Number(stats?.serviceClientCounts?.fomOnly?.total || 0).toLocaleString()} •{" "}
                    <Tooltip title={findMetric('FOM')?.tooltip} arrow>
                      <span>
                        {Number(findMetric('FOM')?.page || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} {findMetric('FOM')?.unit}
                      </span>
                    </Tooltip>
                  </span>
                </div>

                {/* CAL Section */}
                <div className="flex items-center border-l border-gray-300 pl-4">
                  <span className="font-medium text-amber-700">
                    CAL: {findMetric('CAL')?.currentCalType} • {Number(findMetric('CAL')?.metrics?.[0]?.page || 0).toLocaleString()} / {Number(findMetric('CAL')?.metrics?.[0]?.total || 0).toLocaleString()} •{" "}
                    Sold: {Number(findMetric('CAL')?.metrics?.[1]?.page || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} / {Number(findMetric('CAL')?.metrics?.[1]?.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} {findMetric('CAL')?.metrics?.[1]?.unit} •{" "}
                    <Tooltip title={findMetric('CAL')?.metrics?.[2]?.tooltip} arrow>
                      <span>
                        Paid: {Number(findMetric('CAL')?.metrics?.[2]?.page || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} / {Number(findMetric('CAL')?.metrics?.[2]?.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} {findMetric('CAL')?.metrics?.[2]?.unit}
                      </span>
                    </Tooltip>
                    <span> • </span>
                    <Tooltip title={findMetric('CAL')?.metrics?.[3]?.tooltip} arrow>
                      <span>
                        Balance: {Number(findMetric('CAL')?.metrics?.[3]?.page || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} / {Number(findMetric('CAL')?.metrics?.[3]?.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} {findMetric('CAL')?.metrics?.[3]?.unit}
                      </span>
                    </Tooltip>
                  </span>
                </div>
              </div>
            </div>
          );
        }

        // Original HRG FOM CAL display (no WMM role)
        return (
          <div className="px-2 py-1 text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-1.5 bg-white border border-gray-200">
              {/* Clients Count */}
              <div className="flex items-center">
                <span className="font-medium text-gray-700">
                  Clients: {Number(stats.clientCount.page || 0).toLocaleString()} / {Number(stats.clientCount.total || 0).toLocaleString()}
                </span>
              </div>

              {/* HRG Section */}
              <div className="flex items-center border-l border-gray-300 pl-4">
                <span className="font-medium text-blue-700">
                  HRG: {Number(stats?.serviceClientCounts?.hrgOnly?.page || 0).toLocaleString()} / {Number(stats?.serviceClientCounts?.hrgOnly?.total || 0).toLocaleString()} •{" "}
                  <Tooltip title={findMetric('HRG')?.tooltip} arrow>
                    <span>
                      {Number(findMetric('HRG')?.page || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} / {Number(findMetric('HRG')?.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} {findMetric('HRG')?.unit}
                    </span>
                  </Tooltip>
                </span>
              </div>

              {/* FOM Section */}
              <div className="flex items-center border-l border-gray-300 pl-4">
                <span className="font-medium text-green-700">
                  FOM: {Number(stats?.serviceClientCounts?.fomOnly?.page || 0).toLocaleString()} / {Number(stats?.serviceClientCounts?.fomOnly?.total || 0).toLocaleString()} •{" "}
                  <Tooltip title={findMetric('FOM')?.tooltip} arrow>
                    <span>
                      {Number(findMetric('FOM')?.page || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} / {Number(findMetric('FOM')?.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} {findMetric('FOM')?.unit}
                    </span>
                  </Tooltip>
                </span>
              </div>

              {/* CAL Section */}
              <div className="flex items-center border-l border-gray-300 pl-4">
                <span className="font-medium text-amber-700">
                  CAL: {findMetric('CAL')?.currentCalType} • {Number(findMetric('CAL')?.metrics?.[0]?.page || 0).toLocaleString()} / {Number(findMetric('CAL')?.metrics?.[0]?.total || 0).toLocaleString()} •{" "}
                  Sold: {Number(findMetric('CAL')?.metrics?.[1]?.page || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} / {Number(findMetric('CAL')?.metrics?.[1]?.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} {findMetric('CAL')?.metrics?.[1]?.unit} •{" "}
                  <Tooltip title={findMetric('CAL')?.metrics?.[2]?.tooltip} arrow>
                    <span>
                      Paid: {Number(findMetric('CAL')?.metrics?.[2]?.page || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} / {Number(findMetric('CAL')?.metrics?.[2]?.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} {findMetric('CAL')?.metrics?.[2]?.unit}
                    </span>
                  </Tooltip>
                  <span> • </span>
                  <Tooltip title={findMetric('CAL')?.metrics?.[3]?.tooltip} arrow>
                    <span className="text-red-600">
                      Balance: {Number(findMetric('CAL')?.metrics?.[3]?.page || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} / {Number(findMetric('CAL')?.metrics?.[3]?.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} {findMetric('CAL')?.metrics?.[3]?.unit}
                    </span>
                  </Tooltip>
                  <span> • </span>
                  <Tooltip title="Number of records with non-numeric payment amounts" arrow>
                    <span>
                      Non-numeric: {Number(findMetric('CAL')?.metrics?.[4]?.page || 0).toLocaleString()} / {Number(findMetric('CAL')?.metrics?.[4]?.total || 0).toLocaleString()}
                    </span>
                  </Tooltip>
                </span>
              </div>
            </div>
          </div>
        );
      }
      case "WMM": {
        const wmmMetric = findMetric('WMM');
        return (
          <div className="flex flex-wrap px-2 py-1">
            {clientCountDisplay}
            <span className="text-base text-blue-700 font-medium ml-4">
              WMM Clients:{" "}
              <span className="font-bold">
                {Number(stats?.serviceClientCounts?.wmm?.page || 0).toLocaleString()}
              </span>{" "}
              <span className="text-gray-500 text-xs">(Page)</span> /{" "}
              <span className="font-bold">
                {Number(stats?.serviceClientCounts?.wmm?.total || 0).toLocaleString()}
              </span>{" "}
              <span className="text-gray-500 text-xs">(Total)</span>
            </span>
            <span className="text-base text-blue-700 font-medium ml-4">
              Copies:{" "}
              <span className="font-bold">
                {Number(wmmMetric?.page || 0).toLocaleString()}
              </span>{" "}
              <span className="text-gray-500 text-xs">(Page)</span> /{" "}
              <span className="font-bold">
                {Number(wmmMetric?.total || 0).toLocaleString()}
              </span>{" "}
              <span className="text-gray-500 text-xs">(Total)</span>
            </span>
          </div>
        );
      }
      default:
        // Return empty div if no role matches
        return <div></div>;
    }
  }, [
    stats,
    userRole,
    hasWmmRole,
    clientCountDisplay,
    statsLoading
  ]);

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
                  className="bg-blue-600 text-white font-bold text-base sm:text-lg sticky top-0 whitespace-nowrap cursor-pointer"
                  style={{
                    position: 'relative',
                    height: isMobile ? '40px' : isTablet ? '48px' : '56px',
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
                row.original.isFiltered = stats.clientCount.total !== stats.clientCount.page;
              }
              
              return (
                <TableRow
                  key={`${row.id}-${rowIndex}`}
                  className={`even:bg-gray-150 odd:bg-blue-100 hover:bg-blue-100 hover:cursor-pointer border-b border-gray-500 last:border-none transition-all duration-300 ease-in-out text-xs sm:text-sm md:text-base ${
                    animationComplete
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-2"
                  }`}
                  style={{
                    transitionDelay: `${rowIndex * 40}ms`,
                    minHeight: isMobile ? '40px' : isTablet ? '48px' : '56px',
                  }}
                >
                  {row.getVisibleCells().map((cell) => {
                    const cellWidth = cell.column.columnDef.size;
                    return (
                      <TableCell
                        key={`${cell.id}-${rowIndex}`}
                        style={{
                          width: cellWidth,
                          maxWidth: cellWidth ? `${cellWidth}px` : "auto",
                          minWidth: cellWidth ? `${cellWidth}px` : "auto",
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          minHeight: isMobile ? '40px' : isTablet ? '48px' : '56px',
                        }}
                        className={`${
                          cell.column.id === "select" ? "p-0" : "px-2 sm:px-4 py-1 sm:py-2"
                        } overflow-visible text-xs sm:text-sm md:text-base`}
                        onClick={(event) => handleCellClick(event, row, cell)}
                      >
                        {cell.column.id === "Client Name" ? (
                          <div style={{ textAlign: "left" }}>
                            {cell.getValue().split("<br>").map((part, index) => {
                              if (part.startsWith("Spack: ")) {
                                return (
                                  <div key={index} className="mt-1">
                                    <span className={`px-2 py-0.5 text-sm font-medium bg-amber-100 text-amber-800`}>
                                      {part.substring(6)} {/* Remove "Spack: " prefix */}
                                    </span>
                                  </div>
                                );
                              } else if (part.startsWith("Name: ")) {
                                const name = part.substring(6); // Remove "Name: " prefix
                                const hasCompany = cell.getValue().split("<br>").some(p => p.startsWith("Company: "));
                                return (
                                  <div key={index} className={`${name !== "No Name" ? "font-bold text-base" : "text-base"}`}>
                                    {name}
                                  </div>
                                );
                              } else if (part.startsWith("Company: ")) {
                                const hasName = cell.getValue().split("<br>").some(p => p.startsWith("Name: ") && !p.includes("No Name"));
                                return (
                                  <div key={index} className={`${hasName ? "text-sm italic" : "font-bold text-base"}`}>
                                    {part.substring(9)} {/* Remove "Company: " prefix */}
                                  </div>
                                );
                              } else if (part.startsWith("Type: ") || part.startsWith("Group: ")) {
                                return (
                                  <div key={index} className="text-gray-600 font-medium">
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
                          <ul className="max-w-[450px] overflow-y-auto scrollbar-hide text-xs sm:text-sm md:text-base"
                              style={{ maxHeight: `${getMaxHeight()}px` }}>
                            {cell.getValue().length > 0 ? (
                              cell.getValue().map((sub, index) => {
                                // Get status color class
                                const statusClass =
                                  sub.status === "expired"
                                    ? "text-red-600 font-bold"
                                    : sub.status === "expiring-soon"
                                    ? "text-amber-600 font-bold"
                                    : sub.status === "active"
                                    ? "text-green-600"
                                    : "";

                                // Get status indicator
                                const statusIndicator =
                                  sub.status === "expired"
                                    ? "🔴 "
                                    : sub.status === "expiring-soon"
                                    ? "🟡 "
                                    : sub.status === "active"
                                    ? "🟢 "
                                    : "";

                                return (
                                  <li key={index} className="mb-1">
                                    <div className="flex flex-col">
                                      <span className={statusClass}>
                                        {statusIndicator}
                                        <strong>{sub.subsclass}</strong>:{" "}
                                        {sub.subsdate} - {sub.enddate}, Cps:{" "}
                                        {sub.copies}
                                      </span>
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
                                        <div className="text-xs ml-4 mt-1">
                                          {sub.calendar ? (
                                            <span className="text-white bg-orange-400 px-2 py-0.5 rounded-full font-medium">
                                              Calendar ✓
                                            </span>
                                          ) : (
                                            <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                              No Calendar
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
                          <div className="w-full overflow-y-auto text-xs sm:text-sm md:text-base"
                               style={{ maxHeight: `${getMaxHeight()}px` }}>
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
                                        Php {hrg.paymtamt} - Ref: #{hrg.paymtref}
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
                          <div className="w-full overflow-y-auto text-xs sm:text-sm md:text-base"
                               style={{ maxHeight: `${getMaxHeight()}px` }}>
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
                                        Php {fom.paymtamt} - Ref: #{fom.paymtref}
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
                          <div className="w-full overflow-y-auto text-xs sm:text-sm md:text-base"
                               style={{ maxHeight: `${getMaxHeight()}px` }}>
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
                                        Qty: {cal.calqty} - Cost: {cal.calamt} ={" "}
                                        {(
                                          parseInt(cal.calqty || 0) *
                                          parseFloat(
                                            cal.calamt?.replace(/[^\d.-]/g, "") ||
                                              0
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
                          <ul className="text-center text-xs sm:text-sm md:text-base">
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
                className="text-center text-xl sm:text-2xl"
                style={{
                  height: isMobile ? '40px' : isTablet ? '48px' : '56px',
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
              className={`sticky bottom-0 bg-white text-xs sm:text-sm font-bold transition-opacity duration-300 ease-in-out ${
                animationComplete ? "opacity-100" : "opacity-0"
              }`}
              style={{
                transitionDelay: `${
                  table.getRowModel().rows.length * 40 + 100
                }ms`,
                height: isMobile ? '30px' : isTablet ? '35px' : '40px',
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
