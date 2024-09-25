import { useState } from "react";
import { IconButton } from "@mui/material";
import AccountCircleSharpIcon from "@mui/icons-material/AccountCircleSharp";
import SettingsSharpIcon from "@mui/icons-material/SettingsSharp";
import NotificationsActiveSharpIcon from "@mui/icons-material/NotificationsActiveSharp";
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
} from "./ShadCN/dropdown-menu";
import Logout from "../../utils/UserAuth/logout";
import { DropdownMenuGroup } from "@radix-ui/react-dropdown-menu";
import { CircleUser, LogOut, Timer } from "lucide-react";

export default function Topbar({ setIsLoggedIn, onInactivityTimeoutChange }) {
  const [, setInactiveTimeout] = useState(300); // Default to 5 minutes (300 seconds)

  const handleTimeout = (timeout) => {
    setInactiveTimeout(timeout);
    if (typeof onInactivityTimeoutChange === "function") {
      onInactivityTimeoutChange(timeout);
    } else {
      console.error("onInactivityTimeoutChange is not a function");
    }
  };

  return (
    <div className="w-full flex justify-end">
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
                  <DropdownMenuRadioGroup>
                    <DropdownMenuRadioItem onClick={() => handleTimeout(30)}>
                      30 seconds
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem onClick={() => handleTimeout(300)}>
                      5 minutes
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem onClick={() => handleTimeout(900)}>
                      15 minutes
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem onClick={() => handleTimeout(1800)}>
                      30 minutes
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              <Logout setIsLoggedIn={setIsLoggedIn} />
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
