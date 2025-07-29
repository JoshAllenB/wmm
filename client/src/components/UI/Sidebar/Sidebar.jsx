import { useState, useEffect } from "react";
import {
  Sidebar,
  sidebarClasses,
  Menu,
  MenuItem,
  SubMenu,
} from "react-pro-sidebar";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AdminPanelSettingsSharpIcon from "@mui/icons-material/AdminPanelSettingsSharp";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import MenuSharpIcon from "@mui/icons-material/MenuSharp";
import GroupsSharpIcon from "@mui/icons-material/GroupsSharp";
import SettingsIcon from "@mui/icons-material/Settings";
import ListIcon from "@mui/icons-material/List";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DownloadIcon from "@mui/icons-material/Download";
import PeopleIcon from "@mui/icons-material/People";
import AccountCircleSharpIcon from "@mui/icons-material/AccountCircleSharp";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import { useUser } from "../../../utils/Hooks/userProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "../ShadCN/dropdown-menu";
import { DropdownMenuGroup } from "@radix-ui/react-dropdown-menu";
import { CircleUser, LogOut, Timer } from "lucide-react";
import Logout from "../../../utils/UserAuth/logout";

export default function MenuSidebar({
  setIsLoggedIn,
  onInactivityTimeoutChange,
}) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [selected, setSelected] = useState("Dashboard");
  const [inactiveTimeout, setInactiveTimeout] = useState(300);
  const { hasRole } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleSelect = (item) => {
    setSelected(item);
  };

  const handleTimeout = (timeout) => {
    setInactiveTimeout(timeout);
    if (typeof onInactivityTimeoutChange === "function") {
      onInactivityTimeoutChange(timeout);
    }
  };

  const hasClientManagementRole = () => {
    return hasRole("WMM") || hasRole("HRG") || hasRole("FOM") || hasRole("CAL");
  };

  const hasDataExportAccess = () => {
    return hasRole("WMM") || hasRole("HRG") || hasRole("CAL");
  };

  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "/login") {
      if (hasClientManagementRole()) {
        navigate("/all-client");
        handleSelect("All Clients");
      } else if (hasRole("Accounting")) {
        navigate("/accounting");
        handleSelect("Accounting");
      } else if (hasRole("Admin")) {
        navigate("/admin-panel");
        handleSelect("Manage Team");
      } else {
        navigate("/login");
      }
    } else {
      const pathToSelected = {
        "/all-client": "All Clients",
        "/accounting": "Accounting",
        "/admin-panel": "Manage Team",
        "/subclass": "Sub. Class",
        "/area": "Area",
        "/group": "Group",
        "/data-export": "Data Export",
      };
      setSelected(pathToSelected[location.pathname] || "Dashboard");
    }
  }, [hasRole, navigate, location.pathname]);

  const menuItemStyles = {
    root: {
      fontSize: "0.875rem",
      fontWeight: 500,
    },
    button: {
      padding: "8px 16px",
      "&:hover": {
        backgroundColor: "#e3f2fd !important",
        color: "#1976d2 !important",
      },
      [`&.ps-active`]: {
        backgroundColor: "#e3f2fd !important",
        color: "#1976d2 !important",
        fontWeight: "600",
      },
    },
    icon: {
      color: "#163366",
      "&:hover": {
        color: "#1976d2",
      },
    },
    SubMenuExpandIcon: {
      color: "#64748b",
    },
    subMenuContent: {
      backgroundColor: "white !important",
      boxShadow:
        "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    },
  };

  return (
    <div className="h-full">
      <Sidebar
        collapsed={isCollapsed}
        width="240px"
        collapsedWidth="64px"
        className="h-full shadow-sm z-50"
        rootStyles={{
          [`.${sidebarClasses.container}`]: {
            backgroundColor: "white",
            color: "#1e293b",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            position: "relative",
          },
          ".ps-submenu-content": {
            backgroundColor: "white !important",
          },
          ".ps-menu-button": {
            padding: "8px 16px !important",
          },
          ".ps-submenu-content .ps-menu-button": {
            padding: "8px 24px !important",
          },
        }}
      >
        <Menu menuItemStyles={menuItemStyles} className="flex-1">
          <div
            className={`mb-2 flex items-center ${
              isCollapsed
                ? "justify-center px-2 py-3"
                : "justify-between px-4 py-3"
            }`}
          >
            {!isCollapsed && (
              <span className="text-lg font-semibold text-gray-800">WMM</span>
            )}
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MenuSharpIcon className="text-gray-600 w-5 h-5" />
            </button>
          </div>

          <div className="space-y-0.5">
            <MenuItem
              icon={<GroupsSharpIcon />}
              component={<Link to="/all-client" />}
              onClick={() => handleSelect("All Clients")}
              active={selected === "All Clients"}
            >
              All Clients
            </MenuItem>
            <MenuItem
              icon={<VolunteerActivismIcon />}
              component={<Link to="/donor" />}
              onClick={() => handleSelect("Donor")}
              active={selected === "Donor"}
            >
              Donor List
            </MenuItem>

            {hasRole("Accounting") && (
              <MenuItem
                icon={<AccountBalanceIcon />}
                component={<Link to="/accounting" />}
                onClick={() => handleSelect("Accounting")}
                active={selected === "Accounting"}
              >
                Accounting
              </MenuItem>
            )}

            {hasRole("Admin") && (
              <MenuItem
                icon={<AdminPanelSettingsSharpIcon />}
                onClick={() => handleSelect("Manage Team")}
                active={selected === "Manage Team"}
                component={<Link to="/admin-panel" />}
              >
                Manage Team
              </MenuItem>
            )}

            {hasDataExportAccess() && (
              <MenuItem
                icon={<DownloadIcon />}
                component={<Link to="/data-export" />}
                onClick={() => handleSelect("Data Export")}
                active={selected === "Data Export"}
              >
                Data Export
              </MenuItem>
            )}

            {hasRole("WMM") && (
              <SubMenu label="Settings" icon={<SettingsIcon />}>
                <MenuItem
                  icon={<ListIcon />}
                  onClick={() => handleSelect("Sub. Class")}
                  active={selected === "Sub. Class"}
                  component={<Link to="/subclass" />}
                >
                  Sub. Class
                </MenuItem>
                <MenuItem
                  icon={<LocationOnIcon />}
                  component={<Link to="/area" />}
                  onClick={() => handleSelect("Area")}
                  active={selected === "Area"}
                >
                  Area
                </MenuItem>
                <MenuItem
                  icon={<PeopleIcon />}
                  component={<Link to="/group" />}
                  onClick={() => handleSelect("Group")}
                  active={selected === "Group"}
                >
                  Groups
                </MenuItem>
              </SubMenu>
            )}
          </div>
        </Menu>

        <div className="border-t border-gray-200">
          <Menu menuItemStyles={menuItemStyles}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors group relative">
                  <AccountCircleSharpIcon className="text-[#163366] min-w-[24px]" />
                  {!isCollapsed && <span className="text-sm">Account</span>}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
                      Account Settings
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" side="right">
                <DropdownMenuLabel className="flex items-center">
                  <CircleUser className="mr-2" />
                  <span>Account Settings</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Timer className="mr-2 h-4 w-4" />
                      <span>Inactivity Timeout</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup value={inactiveTimeout}>
                          <DropdownMenuRadioItem
                            value={30}
                            onClick={() => handleTimeout(30)}
                          >
                            30 seconds
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem
                            value={300}
                            onClick={() => handleTimeout(300)}
                          >
                            5 minutes
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem
                            value={900}
                            onClick={() => handleTimeout(900)}
                          >
                            15 minutes
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem
                            value={1800}
                            onClick={() => handleTimeout(1800)}
                          >
                            30 minutes
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuItem asChild>
                    <div className="flex items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      <Logout setIsLoggedIn={setIsLoggedIn} />
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </Menu>
        </div>
      </Sidebar>
    </div>
  );
}
