import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import setAuthToken from "../Token/setAuthToken";
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "../../components/UI/ShadCN/dropdown-menu";
import { removeTokens } from "../Token/tokenStorage";

export default function Logout({ setIsLoggedIn }) {
  const navigate = useNavigate();
  const [position, setPosition] = useState("bottom");

  const handleLogout = async () => {
    try {
      const token =
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("accessToken");
      if (!token) {
        console.error("No token found");
        setIsLoggedIn(false);
        navigate("/");
        return;
      }

      const reponse = await axios.post(
        "http://10.1.15.15:3001/auth/logout",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (reponse.data.message === "Logout successful") {
        localStorage.removeItem("accessToken");
        sessionStorage.removeItem("accessToken");
        removeTokens();
        setAuthToken(null);
        setIsLoggedIn(false);
        socket.emit("user_status_change", {
          userId: reponse.data.userId,
          status: "Logged Off",
        });
        navigate("/");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
      <DropdownMenuRadioItem onClick={handleLogout}>
        Logout
      </DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  );
}
