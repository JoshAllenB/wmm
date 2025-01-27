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
    <div className="h-full">
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
            <SubMenu
              label="Clients"
              className="font-bold text-lg"
              icon={<GroupsSharpIcon style={{ color: "#333333" }} />}
              style={{ color: "#333333" }}
            >
              <MenuItem
                component={<Link to="/all-client" />}
                onClick={() => handleSelect("All Clients")}
                selected={selected === "All Clients"}
                style={{
                  backgroundColor:
                    selected === "All Clients" ? "#e3f2fd" : "transparent",
                  color: selected === "All Clients" ? "#1976d2" : "#333333",
                }}
              >
                All Clients
              </MenuItem>
              <MenuItem
                component={<Link to="/hrg" />}
                onClick={() => handleSelect("HRG")}
                selected={selected === "HRG"}
                style={{
                  backgroundColor:
                    selected === "HRG" ? "#e3f2fd" : "transparent",
                  color: selected === "HRG" ? "#1976d2" : "#333333",
                }}
              >
                HRG
              </MenuItem>
              <MenuItem
                onClick={() => handleSelect("Inactive Clients")}
                selected={selected === "Inactive Clients"}
                style={{
                  backgroundColor:
                    selected === "Inactive Clients" ? "#e3f2fd" : "transparent",
                  color:
                    selected === "Inactive Clients" ? "#1976d2" : "#333333",
                }}
              >
                Inactive Clients
              </MenuItem>
              <MenuItem
                onClick={() => handleSelect("Archived Clients")}
                selected={selected === "Archived Clients"}
                style={{
                  backgroundColor:
                    selected === "Archived Clients" ? "#e3f2fd" : "transparent",
                  color:
                    selected === "Archived Clients" ? "#1976d2" : "#333333",
                }}
              >
                Archived Clients
              </MenuItem>
            </SubMenu>
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
                </SubMenu>
              </div>
            )}
            <MenuItem
              icon={<CalendarMonthSharpIcon style={{ color: "#333333" }} />}
              onClick={() => handleSelect("Calendar")}
              selected={selected === "Calendar"}
              style={{
                backgroundColor:
                  selected === "Calendar" ? "#e3f2fd" : "transparent",
                color: selected === "Calendar" ? "#1976d2" : "#333333",
              }}
            >
              <Typography variant="h6">Calendar</Typography>
            </MenuItem>
          </div>
        </Menu>
      </Sidebar>
    </div>
  );
}
