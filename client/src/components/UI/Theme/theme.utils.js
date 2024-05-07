import { createContext, useState, useMemo } from "react";
import { createTheme } from "@mui/material";

// Color Design
export const tokens = (mode) => {
  const colors = mode === "dark" ? darkColors : lightColors;
  return colors;
};

const darkColors = {
  white: {
    100: "#333332",
    200: "#656665",
    300: "#989997",
    400: "#caccca",
    500: "#fdfffc",
    600: "#fdfffd",
    700: "#fefffd",
    800: "#fefffe",
    900: "#fffffe",
  },
  grey: {
    100: "#181c1f",
    200: "#31383d",
    300: "#49535c",
    400: "#626f7a",
    500: "#7a8b99",
    600: "#95a2ad",
    700: "#afb9c2",
    800: "#cad1d6",
    900: "#e4e8eb",
  },
  black: {
    100: "#090a0e",
    200: "#12131c",
    300: "#1b1d2b",
    400: "#242639",
    500: "#2d3047",
    600: "#57596c",
    700: "#818391",
    800: "#abacb5",
    900: "#d5d6da",
  },
  yellow: {
    100: "#241f0f",
    200: "#483e1f",
    300: "#6b5e2e",
    400: "#8f7d3e",
    500: "#b39c4d",
    600: "#c2b071",
    700: "#d1c494",
    800: "#e1d7b8",
    900: "#f0ebdb",
  },
  green: {
    100: "#080c02",
    200: "#101804",
    300: "#172305",
    400: "#1f2f07",
    500: "#273b09",
    600: "#52623a",
    700: "#7d896b",
    800: "#a9b19d",
    900: "#d4d8ce",
  },

  blue: {
    100: "#0F172A",
    200: "#1E293B",
    300: "#2D3B4D",
    400: "#3B4D5E",
    500: "#4A5F70",
    600: "#6B8096",
    700: "#8BA2BD",
    800: "#ABC4E3",
    900: "#CBDCFF",
  },
  mirage: {
    50: "#f5f6fa",
    100: "#ebecf3",
    200: "#d2d5e5",
    300: "#aab1cf",
    400: "#7d89b3",
    500: "#5c699b",
    600: "#485281",
    700: "#3b4369",
    800: "#343a58",
    900: "#2f344b",
    950: "#1b1d2b",
  },
};

const lightColors = {
  white: {
    100: "#fffffe",
    200: "#fefffe",
    300: "#fefffd",
    400: "#fdfffd",
    500: "#fdfffc",
    600: "#caccca",
    700: "#989997",
    800: "#656665",
    900: "#333332",
  },
  grey: {
    100: "#e4e8eb",
    200: "#cad1d6",
    300: "#afb9c2",
    400: "#95a2ad",
    500: "#7a8b99",
    600: "#626f7a",
    700: "#49535c",
    800: "#31383d",
    900: "#181c1f",
  },
  black: {
    100: "#d5d6da",
    200: "#abacb5",
    300: "#818391",
    400: "#57596c",
    500: "#2d3047",
    600: "#242639",
    700: "#1b1d2b",
    800: "#12131c",
    900: "#090a0e",
  },
  yellow: {
    100: "#f0ebdb",
    200: "#e1d7b8",
    300: "#d1c494",
    400: "#c2b071",
    500: "#b39c4d",
    600: "#8f7d3e",
    700: "#6b5e2e",
    800: "#483e1f",
    900: "#241f0f",
  },
  green: {
    100: "#d4d8ce",
    200: "#a9b19d",
    300: "#7d896b",
    400: "#52623a",
    500: "#273b09",
    600: "#1f2f07",
    700: "#172305",
    800: "#101804",
    900: "#080c02",
  },

  blue: {
    100: "#CBDCFF",
    200: "#ABC4E3",
    300: "#8BA2BD",
    400: "#6B8096",
    500: "# ",
    600: "#3B4D5E",
    700: "#2D3B4D",
    800: "#1E293B",
    900: "#0F172A",
  },
  mirage: {
    50: "#1b1d2b",
    100: "#2f344b",
    200: "#343a58",
    300: "#3b4369",
    400: "#485281",
    500: "#5c699b",
    600: "#7d89b3",
    700: "#aab1cf",
    800: "#d2d5e5",
    900: "#ebecf3",
    950: "#f5f6fa",
  },
};

// MUI theme
export const themeSettings = (mode) => {
  const colors = tokens(mode);

  return {
    palette: {
      mode: mode,
      ...(mode === "dark"
        ? {
            primary: { main: colors.green[500] }, // Replace with your desired primary color
            secondary: { main: colors.yellow[500] }, // Replace with your desired secondary color
            neutral: {
              main: colors.white[500],
            },
            background: {
              default: colors.black[300], // Replace with your desired background color
              paper: colors.white[100], // Replace with your desired paper color
            },
          }
        : {
            primary: { main: colors.blue[500] }, // Replace with your desired primary color
            secondary: { main: colors.yellow[500] }, // Replace with your desired secondary color
            neutral: {
              main: colors.black[500],
            },
            background: {
              default: colors.white[500], // Replace with your desired background color
              paper: colors.white[100], // Replace with your desired paper color
            },
          }),
    },
    typography: {
      fontFamily: "'Roboto', sans-serif", // Set your desired font family
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 700,
      h1: {
        // Customize typography for h1
        fontSize: "2.5rem",
        fontWeight: 700,
      },
      h2: {
        // Customize typography for h2
        fontSize: "2rem",
        fontWeight: 500,
      },
      h3: {
        // Customize typography for h3
        fontSize: "1.75rem",
        fontWeight: 500,
      },
      h4: {
        // Customize typography for h4
        fontSize: "1.5rem",
        fontWeight: 500,
      },
      h5: {
        // Customize typography for h5
        fontSize: "1.25rem",
        fontWeight: 500,
      },
      h6: {
        // Customize typography for h6
        fontSize: "1rem",
        fontWeight: 500,
      },
    },
  };
};

// context color mode
export const ColorModeContext = createContext({ toggleColorMode: () => {} });

export const useMode = () => {
  const [mode, setMode] = useState("dark");

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () =>
        setMode((prev) => (prev === "light" ? "dark" : "light")),
    }),
    []
  );

  const theme = useMemo(() => createTheme(themeSettings(mode)), [mode]);

  return [theme, colorMode];
};
