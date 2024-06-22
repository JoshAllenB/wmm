import { useContext, useState, useEffect } from "react";
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ShadCN/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import setAuthToken from "../../utils/setAuthToken";

import io from "socket.io-client";
const socket = io("http://localhost:3001");

export default function Topbar({ setIsLoggedIn }) {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const navigate = useNavigate();
  const [position, setPosition] = useState("bottom");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setAuthToken(token);
    }
  }, []);

  const handleClick = () => {
    colorMode.toggleColorMode();
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");
      setAuthToken();

      const response = await axios.post(
        "http://localhost:3001/auth/logout",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.message === "Logout successful") {
        localStorage.removeItem("token");
        setAuthToken(null);
        setIsLoggedIn(false);
        socket.emit("user_status_change", {
          userId: response.data.userId,
          status: "Logged Off",
        });
        navigate("/");
      }
    } catch (error) {
      console.error(error);
    }
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
          <DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
            <DropdownMenuRadioItem onClick={handleLogout}>
              Log-Out
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
