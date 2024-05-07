import { useContext } from "react";
import { IconButton, useTheme } from "@mui/material";
import { ColorModeContext, tokens } from "./Theme/theme.utils";
import AccountCircleSharpIcon from "@mui/icons-material/AccountCircleSharp";
import SettingsSharpIcon from "@mui/icons-material/SettingsSharp";
import NotificationsActiveSharpIcon from "@mui/icons-material/NotificationsActiveSharp";
import LightModeSharpIcon from "@mui/icons-material/LightModeSharp";
import DarkModeSharpIcon from "@mui/icons-material/DarkModeSharp";

export default function Topbar() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);

  const handleClick = () => {
    console.log("icon clicked...");
    colorMode.toggleColorMode();
  };

  console.log("Current theme mode:", theme.palette.mode);

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
      <IconButton className="w-[50px]">
        <AccountCircleSharpIcon color="neutral" />
      </IconButton>
    </div>
  );
}
