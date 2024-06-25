import { useContext } from "react";
import { IconButton, useTheme } from "@mui/material";
import { ColorModeContext, tokens } from "./Theme/theme.utils";
import AccountCircleSharpIcon from "@mui/icons-material/AccountCircleSharp";
import SettingsSharpIcon from "@mui/icons-material/SettingsSharp";
import NotificationsActiveSharpIcon from "@mui/icons-material/NotificationsActiveSharp";
import LightModeSharpIcon from "@mui/icons-material/LightModeSharp";
import DarkModeSharpIcon from "@mui/icons-material/DarkModeSharp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ShadCN/dropdown-menu";
import Logout from "../../utils/UserAuth/logout";

export default function Topbar({ setIsLoggedIn }) {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);

  const handleClick = () => {
    colorMode.toggleColorMode();
  };

  return (
    <div
      style={{ backgroundColor: colors.neutral }}
      className="w-full flex justify-end"
    >
      <IconButton onClick={handleClick} className="w-[50px]">
        {theme.palette.mode === "dark" ? (
          <LightModeSharpIcon color="neutral" />
        ) : (
          <DarkModeSharpIcon color="neutral" />
        )}
      </IconButton>

      <IconButton className="w-[50px]">
        <NotificationsActiveSharpIcon color="neutral" />
      </IconButton>
      <IconButton className="w-[50px]">
        <SettingsSharpIcon color="neutral" />
      </IconButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton className="w-[50px]">
            <AccountCircleSharpIcon color="neutral" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Account Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <Logout setIsLoggedIn={setIsLoggedIn} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
