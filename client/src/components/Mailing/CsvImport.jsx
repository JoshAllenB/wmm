import React, { useState, useRef } from "react";
import { Button } from "../UI/ShadCN/button";
import Modal from "../modal";
import Papa from "papaparse";
import axios from "axios";

const CsvImport = ({ onImportComplete }) => {
  // State for CSV import modal
  const [csvImportModal, setCsvImportModal] = useState(false);
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState([]);
  const [mappings, setMappings] = useState({});
  const [importStep, setImportStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importResults, setImportResults] = useState(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  
  const fileInputRef = useRef(null);

  // Available fields in the subscriber data model
  const availableFields = [
    { key: "id", label: "Client ID", required: false },
    { key: "title", label: "Title", required: false },
    { key: "fname", label: "First Name", required: true },
    { key: "lname", label: "Last Name", required: true },
    { key: "mname", label: "Middle Name", required: false },
    { key: "address", label: "Address", required: true },
    { key: "cellno", label: "Cell Number", required: false },
    { key: "officeno", label: "Telephone Number", required: false },
    { key: "acode", label: "Area Code", required: false },
    { key: "email", label: "Email", required: false },
    { key: "copies", label: "Copies", required: false },
    { key: "enddate", label: "Expiry Date", required: false },
    { key: "subsdate", label: "Subscription Date", required: false },
    { key: "subsclass", label: "Subscription Class", required: false },
    // Service-specific fields
    { key: "hrgQuantity", label: "HRG Quantity", required: false },
    { key: "hrgAmount", label: "HRG Amount", required: false },
    { key: "hrgDate", label: "HRG Payment Date", required: false },
    { key: "fomQuantity", label: "FOM Quantity", required: false },
    { key: "fomAmount", label: "FOM Amount", required: false },
    { key: "fomDate", label: "FOM Payment Date", required: false },
    { key: "calQuantity", label: "CAL Quantity", required: false },
    { key: "calAmount", label: "CAL Amount", required: false },
    { key: "calDate", label: "CAL Payment Date", required: false },
  ];

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  // Parse CSV file
  const parseFile = (file) => {
    setIsLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          setFileData(results.data);
          
          // Initialize mappings based on header names
          const headers = results.meta.fields || [];
          const initialMappings = {};
          
          headers.forEach(header => {
            // Try to find a matching field by comparing headers to field labels
            const matchedField = availableFields.find(field => 
              field.label.toLowerCase() === header.toLowerCase() ||
              field.key.toLowerCase() === header.toLowerCase()
            );
            
            if (matchedField) {
              initialMappings[header] = matchedField.key;
            } else {
              initialMappings[header] = "";
            }
          });
          
          setMappings(initialMappings);
          setImportStep(2);
        } else {
          alert("The CSV file appears to be empty or invalid.");
        }
        setIsLoading(false);
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        alert(`Error parsing CSV file: ${error.message}`);
        setIsLoading(false);
      }
    });
  };

  // Update field mappings
  const handleMappingChange = (csvField, dbField) => {
    setMappings({
      ...mappings,
      [csvField]: dbField
    });
  };

  // Validate data before import
  const validateData = () => {
    const errors = [];
    
    // Check if required fields are mapped
    const requiredFields = availableFields.filter(field => field.required);
    const mappedFields = Object.values(mappings);
    
    requiredFields.forEach(field => {
      if (!mappedFields.includes(field.key)) {
        errors.push(`Required field '${field.label}' is not mapped to any CSV column.`);
      }
    });
    
    // Sample validation of first few rows
    const sampleSize = Math.min(5, fileData.length);
    const sampleData = fileData.slice(0, sampleSize);
    
    sampleData.forEach((row, index) => {
      Object.entries(mappings).forEach(([csvField, dbField]) => {
        if (dbField && requiredFields.some(f => f.key === dbField)) {
          if (!row[csvField] || row[csvField].trim() === '') {
            errors.push(`Row ${index + 1}: Missing required value for '${dbField}' (CSV column: '${csvField}').`);
          }
        }
      });
    });
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Move to review step
  const proceedToReview = () => {
    if (validateData()) {
      setImportStep(3);
    }
  };

  // Import data to system
  const handleImport = async () => {
    setIsLoading(true);
    
    try {
      // Transform data according to mappings
      const transformedData = fileData.map(row => {
        const transformedRow = {};
        
        // Map CSV fields to database fields
        Object.entries(mappings).forEach(([csvField, dbField]) => {
          if (dbField) {
            transformedRow[dbField] = row[csvField];
          }
        });
        
        // Format special fields
        if (transformedRow.enddate) {
          transformedRow.enddate = new Date(transformedRow.enddate);
        }
        
        if (transformedRow.subsdate) {
          transformedRow.subsdate = new Date(transformedRow.subsdate);
        }
        
        // Prepare service-specific data
        const hrgData = {};
        const fomData = {};
        const calData = {};
        
        if (transformedRow.hrgQuantity) {
          hrgData.quantity = transformedRow.hrgQuantity;
          delete transformedRow.hrgQuantity;
        }
        
        if (transformedRow.hrgAmount) {
          hrgData.totalAmount = transformedRow.hrgAmount;
          delete transformedRow.hrgAmount;
        }
        
        if (transformedRow.hrgDate) {
          hrgData.lastPaymentDate = new Date(transformedRow.hrgDate);
          delete transformedRow.hrgDate;
        }
        
        if (transformedRow.fomQuantity) {
          fomData.quantity = transformedRow.fomQuantity;
          delete transformedRow.fomQuantity;
        }
        
        if (transformedRow.fomAmount) {
          fomData.totalAmount = transformedRow.fomAmount;
          delete transformedRow.fomAmount;
        }
        
        if (transformedRow.fomDate) {
          fomData.lastPaymentDate = new Date(transformedRow.fomDate);
          delete transformedRow.fomDate;
        }
        
        if (transformedRow.calQuantity) {
          calData.quantity = transformedRow.calQuantity;
          delete transformedRow.calQuantity;
        }
        
        if (transformedRow.calAmount) {
          calData.totalAmount = transformedRow.calAmount;
          delete transformedRow.calAmount;
        }
        
        if (transformedRow.calDate) {
          calData.lastPaymentDate = new Date(transformedRow.calDate);
          delete transformedRow.calDate;
        }
        
        // Add service data if any field exists
        if (Object.keys(hrgData).length > 0) {
          transformedRow.hrgData = hrgData;
        }
        
        if (Object.keys(fomData).length > 0) {
          transformedRow.fomData = fomData;
        }
        
        if (Object.keys(calData).length > 0) {
          transformedRow.calData = calData;
        }
        
        return transformedRow;
      });
      
      // Send data to server
      const response = await axios.post(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/import-csv`,
        { 
          subscribers: transformedData,
          updateExisting: updateExisting
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      setImportResults(response.data);
      setImportStep(4);
    } catch (error) {
      console.error("Error importing data:", error);
      alert(`Error importing data: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset import process
  const resetImport = () => {
    setFile(null);
    setFileData([]);
    setMappings({});
    setImportStep(1);
    setValidationErrors([]);
    setImportResults(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // Close modal and notify parent
  const handleFinish = () => {
    setCsvImportModal(false);
    resetImport();
    
    if (onImportComplete && typeof onImportComplete === 'function') {
      onImportComplete(importResults);
    }
  };

  // Generate and download sample CSV template
  const downloadSampleTemplate = () => {
    // Create headers based on available fields
    const headers = availableFields.map(field => field.label);
    
    // Create a sample row with placeholder data
    const sampleRow = availableFields.map(field => {
      // Add appropriate placeholder values based on field type
      switch(field.key) {
        case 'id':
          return '12345';
        case 'title':
          return 'Mr.';
        case 'fname':
          return 'John';
        case 'lname':
          return 'Doe';
        case 'mname':
          return 'A.';
        case 'address':
          return '123 Main St.\nAnytown, CA 12345';
        case 'cellno':
          return '555-123-4567';
        case 'officeno':
          return '555-987-6543';
        case 'email':
          return 'john.doe@example.com';
        case 'acode':
          return '001';
        case 'copies':
          return '1';
        case 'enddate':
          return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        case 'subsdate':
          return new Date().toISOString().split('T')[0];
        case 'subsclass':
          return 'Regular';
        case 'hrgQuantity':
        case 'fomQuantity':
        case 'calQuantity':
          return '1';
        case 'hrgAmount':
        case 'fomAmount':
        case 'calAmount':
          return '100.00';
        case 'hrgDate':
        case 'fomDate':
        case 'calDate':
          return new Date().toISOString().split('T')[0];
        default:
          return '';
      }
    });
    
    // Create the CSV content
    const csvContent = [
      headers.join(','),
      sampleRow.join(',')
    ].join('\n');
    
    // Create and trigger the download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'subscriber_import_template.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <>
      <Button
        onClick={() => setCsvImportModal(true)}
        className="text-sm bg-purple-600 hover:bg-purple-800 text-white"
      >
        Import CSV
      </Button>

      {/* CSV Import Modal */}
      <Modal isOpen={csvImportModal} onClose={() => setCsvImportModal(false)}>
        <h2 className="flex justify-center text-xl font-bold text-black mb-2">
          Import Subscriber Data from CSV
        </h2>
        
        {/* Step 1: File Selection */}
        {importStep === 1 && (
          <div className="flex flex-col items-center p-4">
            <div className="mb-4 text-center">
              <p className="text-gray-600 mb-2">Select a CSV file with subscriber data to import.</p>
              <p className="text-sm text-gray-500">
                The file should contain headers and data in a standard CSV format.
              </p>
            </div>
            
            <div className="flex flex-col items-center w-full max-w-md">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-purple-50 file:text-purple-700
                  hover:file:bg-purple-100
                  mb-4"
              />
              
              {/* Add sample template download button */}
              <div className="w-full mb-4 p-3 bg-gray-50 border rounded">
                <p className="text-sm text-gray-600 mb-2">
                  Not sure about the format? Download a sample template to get started:
                </p>
                <Button
                  onClick={downloadSampleTemplate}
                  variant="outline"
                  className="w-full text-purple-700 border-purple-400"
                >
                  Download Sample Template
                </Button>
              </div>
              
              <div className="flex justify-between w-full mt-6">
                <Button
                  onClick={() => setCsvImportModal(false)}
                  variant="secondary"
                >
                  Cancel
                </Button>
                
                <Button
                  disabled={!file || isLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => fileInputRef.current.click()}
                >
                  {isLoading ? "Processing..." : "Select File"}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Step 2: Field Mapping */}
        {importStep === 2 && (
          <div className="flex flex-col items-center p-4">
            <div className="mb-4 text-center">
              <p className="text-gray-600 mb-2">Map CSV columns to subscriber data fields</p>
              <p className="text-sm text-gray-500">
                Required fields are marked with an asterisk (*).
              </p>
            </div>
            
            <div className="w-full max-w-2xl overflow-y-auto max-h-96 mb-4">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-4 border text-left">CSV Column</th>
                    <th className="py-2 px-4 border text-left">System Field</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(mappings).map((csvField) => (
                    <tr key={csvField} className="border-b">
                      <td className="py-2 px-4 border">{csvField}</td>
                      <td className="py-2 px-4 border">
                        <select 
                          value={mappings[csvField]} 
                          onChange={(e) => handleMappingChange(csvField, e.target.value)}
                          className="w-full p-1 border rounded"
                        >
                          <option value="">-- Ignore this column --</option>
                          {availableFields.map(field => (
                            <option key={field.key} value={field.key}>
                              {field.label} {field.required ? '*' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Preview of first few rows */}
            <div className="w-full max-w-2xl mb-4">
              <h3 className="text-md font-semibold mb-2">Data Preview (First 3 Rows)</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(mappings).map(header => (
                        <th key={header} className="py-1 px-2 border">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fileData.slice(0, 3).map((row, idx) => (
                      <tr key={idx} className="border-b">
                        {Object.keys(mappings).map(header => (
                          <td key={`${idx}-${header}`} className="py-1 px-2 border truncate max-w-xs">
                            {row[header] || ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex justify-between w-full mt-4">
              <Button
                onClick={resetImport}
                variant="secondary"
              >
                Back
              </Button>
              
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={proceedToReview}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Continue"}
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 3: Review and Validation */}
        {importStep === 3 && (
          <div className="flex flex-col items-center p-4">
            <div className="mb-4 text-center">
              <p className="text-gray-600 mb-2">Review import before proceeding</p>
              <p className="text-sm text-gray-500">
                {fileData.length} records will be imported.
              </p>
            </div>
            
            {/* Display validation errors if any */}
            {validationErrors.length > 0 && (
              <div className="w-full max-w-2xl mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <h3 className="text-md font-semibold text-red-700 mb-2">
                  Validation Warnings ({validationErrors.length})
                </h3>
                <ul className="list-disc pl-5 text-sm text-red-600 max-h-40 overflow-y-auto">
                  {validationErrors.map((error, idx) => (
                    <li key={idx} className="mb-1">{error}</li>
                  ))}
                </ul>
                <p className="text-sm mt-2 text-red-600">
                  You can proceed with the import, but some records may be skipped or have missing data.
                </p>
              </div>
            )}
            
            {/* Field mapping summary */}
            <div className="w-full max-w-2xl mb-4">
              <h3 className="text-md font-semibold mb-2">Field Mapping Summary</h3>
              <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded">
                {Object.entries(mappings).map(([csvField, dbField]) => (
                  dbField && (
                    <div key={csvField} className="flex justify-between">
                      <span className="text-gray-600">{csvField}:</span>
                      <span className="font-medium">{availableFields.find(f => f.key === dbField)?.label || dbField}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
            
            {/* Update Existing Toggle */}
            <div className="w-full max-w-2xl mb-4 p-3 bg-blue-50 rounded border border-blue-200">
              <h3 className="text-md font-semibold mb-2 text-blue-700">Import Options</h3>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="updateExisting"
                  checked={updateExisting}
                  onChange={() => setUpdateExisting(!updateExisting)}
                  className="mr-2 h-4 w-4"
                />
                <label htmlFor="updateExisting" className="text-blue-800">
                  Update existing subscribers if found (by ID or name/address)
                </label>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                {updateExisting 
                  ? "Records with matching ID, name or address will be updated with new information."
                  : "Only new subscribers will be added. Existing subscribers will be skipped."}
              </p>
            </div>
            
            <div className="flex justify-between w-full mt-4">
              <Button
                onClick={() => setImportStep(2)}
                variant="secondary"
              >
                Back
              </Button>
              
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={handleImport}
                disabled={isLoading}
              >
                {isLoading ? "Importing..." : "Import Data"}
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 4: Results */}
        {importStep === 4 && (
          <div className="flex flex-col items-center p-4">
            <div className="mb-6 text-center">
              <h3 className="text-lg font-semibold text-green-600 mb-2">Import Complete!</h3>
              <p className="text-gray-600">
                The import process has completed. Here is a summary of the results:
              </p>
            </div>
            
            <div className="w-full max-w-md mb-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                <div className="text-center p-3 bg-green-50 rounded">
                  <p className="text-2xl font-bold text-green-600">
                    {importResults?.success || 0}
                  </p>
                  <p className="text-sm text-gray-600">Records Added</p>
                </div>
                
                <div className="text-center p-3 bg-blue-50 rounded">
                  <p className="text-2xl font-bold text-blue-600">
                    {importResults?.updated || 0}
                  </p>
                  <p className="text-sm text-gray-600">Records Updated</p>
                </div>
                
                <div className="text-center p-3 bg-yellow-50 rounded">
                  <p className="text-2xl font-bold text-yellow-600">
                    {importResults?.skipped || 0}
                  </p>
                  <p className="text-sm text-gray-600">Records Skipped</p>
                </div>
                
                <div className="text-center p-3 bg-red-50 rounded">
                  <p className="text-2xl font-bold text-red-600">
                    {importResults?.errors || 0}
                  </p>
                  <p className="text-sm text-gray-600">Errors</p>
                </div>
              </div>
            </div>
            
            {importResults?.errorDetails && importResults.errorDetails.length > 0 && (
              <div className="w-full max-w-2xl mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <h3 className="text-md font-semibold text-red-700 mb-2">
                  Error Details
                </h3>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-red-100">
                        <th className="p-1 text-left">Row</th>
                        <th className="p-1 text-left">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResults.errorDetails.map((error, idx) => (
                        <tr key={idx} className="border-b border-red-100">
                          <td className="p-1">{error.row || 'N/A'}</td>
                          <td className="p-1">{error.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div className="flex justify-center w-full mt-4">
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleFinish}
              >
                Finish
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default CsvImport; 