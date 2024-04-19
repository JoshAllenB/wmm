import { useContext } from "react";
import { Box, IconButton, useTheme } from "@mui/material";
import { ColorModeContext, tokens } from "./theme.utils";
import AccountCircleSharpIcon from "@mui/icons-material/AccountCircleSharp";
import SettingsSharpIcon from "@mui/icons-material/SettingsSharp";
import NotificationsActiveSharpIcon from "@mui/icons-material/NotificationsActiveSharp";
import LightModeSharpIcon from "@mui/icons-material/LightModeSharp";
import DarkModeSharpIcon from "@mui/icons-material/DarkModeSharp";

export default function Topbar() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);

  return (
    <Box
      backgroundColor={colors.primary} // Use the custom background color
      className="w-full p-4 flex justify-end"
    >
      <IconButton onClick={colorMode.toggleColorMode} className="w-[50px]">
        {theme.palette.mode === "dark" ? (
          <DarkModeSharpIcon color="neutral" />
        ) : (
          <LightModeSharpIcon color="neutral" />
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
    </Box>
  );
}
