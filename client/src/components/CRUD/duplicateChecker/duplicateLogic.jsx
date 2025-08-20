// useDuplicateChecker.js
import { useState, useCallback, useMemo } from "react";
import axios from "axios";
import { debounce } from "lodash";
import DuplicatePanel from "./duplicatePanel";

// Utility function to normalize address for more consistent duplicate checking
const normalizeAddress = (address) => {
  if (!address || typeof address !== "string") return "";

  return (
    address
      .toUpperCase()
      // Standardize common street abbreviations
      .replace(/\bST\b|\bSTREET\b/gi, "STREET")
      .replace(/\bAVE\b|\bAVENUE\b/gi, "AVENUE")
      .replace(/\bRD\b|\bROAD\b/gi, "ROAD")
      .replace(/\bBLVD\b|\bBOULEVARD\b/gi, "BOULEVARD")
      .replace(/\bLN\b|\bLANE\b/gi, "LANE")
      .replace(/\bDR\b|\bDRIVE\b/gi, "DRIVE")
      // Remove apartment/unit numbers
      .replace(
        /\bAPT\b.*\d+|\bUNIT\b.*\d+|\bNO\b\.?\s*\d+|\bSUITE\b.*\d+/gi,
        ""
      )
      // Remove common punctuation and standardize spacing
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
};

const useDuplicateChecker = () => {
  const [potentialDuplicates, setPotentialDuplicates] = useState([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState(null);
  const [viewingDuplicate, setViewingDuplicate] = useState(false);

  // Create a debounced function to check for duplicates
  const checkForDuplicates = useCallback(
    debounce(async (checkData, fieldChanged = null) => {
      // Check if any of the specified fields are populated
      const hasRequiredData =
        (checkData.lname && checkData.lname.length >= 2) ||
        (checkData.fname && checkData.fname.length >= 2) ||
        (checkData.company && checkData.company.length >= 2) ||
        (checkData.address && checkData.address.length >= 3) ||
        (checkData.cellno && checkData.cellno.length >= 5) ||
        (checkData.contactnos && checkData.contactnos.length >= 5) ||
        (checkData.bdate && checkData.bdate.length > 0) ||
        (checkData.bdateMonth && checkData.bdateDay) || // Trigger if day and month are present
        (checkData.housestreet && checkData.housestreet.length >= 2) ||
        (checkData.subdivision && checkData.subdivision.length >= 2) ||
        (checkData.barangay && checkData.barangay.length >= 2);

      if (!hasRequiredData) {
        setPotentialDuplicates([]);
        setShowDuplicates(false);
        setIsCheckingDuplicates(false);
        return;
      }

      try {
        const response = await axios.post(
          `http://${
            import.meta.env.VITE_IP_ADDRESS
          }:3001/clients/check-duplicates`,
          checkData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );

        if (response.data.matches && response.data.matches.length > 0) {
          setPotentialDuplicates(response.data);
          setShowDuplicates(true);
        } else {
          setPotentialDuplicates([]);
          setShowDuplicates(false);
        }
      } catch (error) {
        console.error("Error checking for duplicates:", error);
        setPotentialDuplicates([]);
        setShowDuplicates(false);
      } finally {
        setIsCheckingDuplicates(false);
      }
    }, 300),
    []
  );

  // Add an immediate clearing function for better UX
  const immediatelyClearDuplicates = () => {
    if (potentialDuplicates.length > 0) {
      setPotentialDuplicates([]);
      setShowDuplicates(false);
    }
  };

  // Function to handle viewing a duplicate client
  const handleViewDuplicate = async (clientId) => {
    try {
      // Fetch full client details
      const response = await axios.get(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/${clientId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.data) {
        setSelectedDuplicate(response.data);
        setViewingDuplicate(true);
      }
    } catch (error) {
      console.error("Error fetching client details:", error);
    }
  };

  // Handle closing the duplicate view
  const handleCloseDuplicateView = () => {
    setViewingDuplicate(false);
    setSelectedDuplicate(null);
  };

  // Memoize the DuplicatePanel component to prevent unnecessary re-renders
  const MemoizedDuplicatePanel = useMemo(() => {
    return () => (
      <DuplicatePanel
        potentialDuplicates={potentialDuplicates}
        isCheckingDuplicates={isCheckingDuplicates}
        handleViewDuplicate={handleViewDuplicate}
      />
    );
  }, [isCheckingDuplicates, potentialDuplicates.length, handleViewDuplicate]);

  return {
    potentialDuplicates,
    isCheckingDuplicates,
    showDuplicates,
    selectedDuplicate,
    viewingDuplicate,
    setPotentialDuplicates,
    setIsCheckingDuplicates,
    setShowDuplicates,
    setSelectedDuplicate,
    setViewingDuplicate,
    checkForDuplicates,
    immediatelyClearDuplicates,
    handleViewDuplicate,
    handleCloseDuplicateView,
    DuplicatePanel: MemoizedDuplicatePanel,
    normalizeAddress,
  };
};

export default useDuplicateChecker;
