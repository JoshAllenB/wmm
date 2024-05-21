import { useState } from "react";
import {
  Sidebar,
  sidebarClasses,
  Menu,
  MenuItem,
  SubMenu,
} from "react-pro-sidebar";
import { useTheme, Typography } from "@mui/material";
import { tokens } from "../Theme/theme.utils";
import { Link } from "react-router-dom";
import AdminPanelSettingsSharpIcon from "@mui/icons-material/AdminPanelSettingsSharp";
import CalendarMonthSharpIcon from "@mui/icons-material/CalendarMonthSharp";
import SpaceDashboardSharpIcon from "@mui/icons-material/SpaceDashboardSharp";
import MenuSharpIcon from "@mui/icons-material/MenuSharp";
import GroupsSharpIcon from "@mui/icons-material/GroupsSharp";

export default function MenuSidebar() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selected, setSelected] = useState("Dashboard");

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const backgroundColor =
    theme.palette.mode === "dark" ? colors.mirage[900] : colors.mirage[100];

  const MenuItemStyles = {
    root: {
      backgroundColor,
    },
    button: {
      "&:hover": {
        backgroundColor: colors.mirage[500],
        color: colors.mirage[100],
      },
    },
    label: ({ open }) => ({
      fontWeight: open ? 600 : undefined,
      color: colors.white[500],
    }),
  };

  return (
    <div className="h-full">
      <Sidebar
        collapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
        className="h-full"
        rootStyles={{
          [`.${sidebarClasses.container}`]: {
            backgroundColor: backgroundColor,
          },
        }}
      >
        <Menu menuItemStyles={MenuItemStyles}>
          <MenuItem
            onClick={toggleCollapse}
            icon={<MenuSharpIcon color="secondary" />}
          >
            {!isCollapsed && (
              <Typography variant="h5" color="white">
                WMM
              </Typography>
            )}
          </MenuItem>
          <div className="w-full">
            <MenuItem
              icon={<SpaceDashboardSharpIcon color="secondary" />}
              onClick={() => setSelected("Dashboard")}
              selected={selected === "Dashboard"}
            >
              <Typography variant="h6" color="white">
                Dashboard
              </Typography>
              {/* <Link to={"/dashboard"} /> */}
            </MenuItem>
            <SubMenu
              label="Clients"
              color="secondary"
              icon={<GroupsSharpIcon color="secondary" />}
            >
              <MenuItem component={<Link to="/all-client" />}>
                All Clients
              </MenuItem>
              <MenuItem>Inactive Clients</MenuItem>
              <MenuItem>Archived Clients</MenuItem>
            </SubMenu>
            <MenuItem
              icon={<AdminPanelSettingsSharpIcon color="secondary" />}
              onClick={() => setSelected("Manage Team")}
              selected={selected === "Manage Team"}
            >
              <Typography variant="h6" color="white">
                Manage Team
              </Typography>
            </MenuItem>
            <MenuItem
              icon={<CalendarMonthSharpIcon color="secondary" />}
              onClick={() => setSelected("Calendar")}
              selected={selected === "Calendar"}
            >
              <Typography variant="h6" color="white">
                Calendar
              </Typography>
            </MenuItem>
          </div>
        </Menu>
      </Sidebar>
    </div>
  );
}
