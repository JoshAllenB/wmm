import { useState, useEffect } from "react";

const Footer = () => {
  const [versionData, setVersionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadVersionData = async () => {
      try {
        const response = await fetch("/version.json");
        if (response.ok) {
          const data = await response.json();
          setVersionData(data);
        }
      } catch (error) {
        console.warn("Could not load version data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVersionData();
  }, []);

  if (isLoading || !versionData) {
    return null;
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="fixed bottom-1 right-2 z-50">
      <div className="text-white text-xs px-2 py-1 rounded opacity-60 hover:opacity-100 transition-opacity duration-200">
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="text-gray-500">
            v{versionData.version} {versionData.commit}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Footer;
