import { useState } from "react";
import {
  Sidebar,
  sidebarClasses,
  Menu,
  MenuItem,
  SubMenu,
} from "react-pro-sidebar";
import { Typography } from "@mui/material";
import { Link } from "react-router-dom";
import AdminPanelSettingsSharpIcon from "@mui/icons-material/AdminPanelSettingsSharp";
import CalendarMonthSharpIcon from "@mui/icons-material/CalendarMonthSharp";
import SpaceDashboardSharpIcon from "@mui/icons-material/SpaceDashboardSharp";
import MenuSharpIcon from "@mui/icons-material/MenuSharp";
import GroupsSharpIcon from "@mui/icons-material/GroupsSharp";
import SettingsIcon from "@mui/icons-material/Settings";
import ListIcon from "@mui/icons-material/List";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DownloadIcon from "@mui/icons-material/Download";
import PeopleIcon from "@mui/icons-material/People";
import { useUser } from "../../../utils/Hooks/userProvider";

export default function MenuSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selected, setSelected] = useState("Dashboard");
  const { hasRole } = useUser();

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleSelect = (item) => {
    setSelected(item);
  };

  return (
    <div className="h-full z-20">
      <Sidebar
        collapsed={!isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
        className="h-full bg-gray-100"
        rootStyles={{
          [`.${sidebarClasses.container}`]: {
            backgroundColor: "#f5f5f5",
            color: "#333333",
          },
        }}
      >
        <Menu>
          <MenuItem
            onClick={toggleCollapse}
            icon={<MenuSharpIcon style={{ color: "#333333" }} />}
          >
            {!isCollapsed && (
              <Typography variant="h5" style={{ color: "#333333" }}>
                WMM
              </Typography>
            )}
          </MenuItem>
          <div className="w-full">
            <MenuItem
              icon={<SpaceDashboardSharpIcon style={{ color: "#333333" }} />}
              onClick={() => handleSelect("Dashboard")}
              selected={selected === "Dashboard"}
              style={{
                backgroundColor:
                  selected === "Dashboard" ? "#e3f2fd" : "transparent",
                color: selected === "Dashboard" ? "#1976d2" : "#333333",
              }}
            >
              <Typography variant="h6">Dashboard</Typography>
              {/* <Link to={"/dashboard"} /> */}
            </MenuItem>

            <MenuItem
              icon={<GroupsSharpIcon style={{ color: "#333333" }} />}
              component={<Link to="/all-client" />}
              onClick={() => handleSelect("All Clients")}
              selected={selected === "All Clients"}
              style={{
                backgroundColor:
                  selected === "All Clients" ? "#e3f2fd" : "transparent",
                color: selected === "All Clients" ? "#1976d2" : "#333333",
              }}
            >
              <Typography variant="h6">All Clients</Typography>
            </MenuItem>
            {hasRole("Admin" || hasRole("Accounting")) && (
              <MenuItem
                icon={<CalendarMonthSharpIcon style={{ color: "#333333" }} />}
                component={<Link to="/accounting" />}
                onClick={() => handleSelect("Accounting")}
                selected={selected === "Accounting"}
                style={{
                  backgroundColor:
                    selected === "Accounting" ? "#e3f2fd" : "transparent",
                  color: selected === "Accounting" ? "#1976d2" : "#333333",
                }}
              >
                <Typography variant="h6">Accounting</Typography>
              </MenuItem>
            )}
            {hasRole("Admin") && (
              <div>
                <MenuItem
                  icon={
                    <AdminPanelSettingsSharpIcon style={{ color: "#333333" }} />
                  }
                  onClick={() => handleSelect("Manage Team")}
                  selected={selected === "Manage Team"}
                  component={<Link to="/admin-panel" />}
                  style={{
                    backgroundColor:
                      selected === "Manage Team" ? "#e3f2fd" : "transparent",
                    color: selected === "Manage Team" ? "#1976d2" : "#333333",
                  }}
                >
                  <Typography variant="h6">Manage Team</Typography>
                </MenuItem>
                <SubMenu
                  label="Settings"
                  className="font-bold text-lg"
                  icon={<SettingsIcon style={{ color: "#333333" }} />}
                  style={{ color: "#333333" }}
                >
                  <MenuItem
                    icon={<ListIcon style={{ color: "#333333" }} />}
                    onClick={() => handleSelect("Manage Team")}
                    selected={selected === "Manage Team"}
                    component={<Link to="/subclass" />}
                    style={{
                      backgroundColor:
                        selected === "Manage Team" ? "#e3f2fd" : "transparent",
                      color: selected === "Manage Team" ? "#1976d2" : "#333333",
                    }}
                  >
                    <Typography variant="h8">Sub. Class</Typography>
                  </MenuItem>
                  <MenuItem
                    icon={<LocationOnIcon style={{ color: "#333333" }} />}
                    component={<Link to="/area" />}
                    onClick={() => handleSelect("Area")}
                    selected={selected === "Area"}
                  >
                    Area
                  </MenuItem>
                  <MenuItem
                    icon={<PeopleIcon style={{ color: "#333333" }} />}
                    component={<Link to="/group" />}
                    onClick={() => handleSelect("Group")}
                    selected={selected === "Group"}
                    style={{
                      backgroundColor:
                        selected === "Group" ? "#e3f2fd" : "transparent",
                      color: selected === "Group" ? "#1976d2" : "#333333",
                    }}
                  >
                    <Typography variant="h6">Groups</Typography>
                  </MenuItem>
                  <MenuItem
                    icon={<DownloadIcon style={{ color: "#333333" }} />}
                    component={<Link to="/data-export" />}
                    onClick={() => handleSelect("Data Export")}
                    selected={selected === "Data Export"}
                    style={{
                      backgroundColor:
                        selected === "Data Export" ? "#e3f2fd" : "transparent",
                      color: selected === "Data Export" ? "#1976d2" : "#333333",
                    }}
                  >
                    <Typography variant="h6">Data Export</Typography>
                  </MenuItem>
                </SubMenu>
              </div>
            )}
          </div>
        </Menu>
      </Sidebar>
    </div>
  );
}
