import React, { createContext, useContext, useState, useEffect } from 'react';

type DeviceType = 'mobile' | 'tablet' | 'desktop' | null;

interface DeviceContextType {
  deviceType: DeviceType;
  setDeviceType: (type: DeviceType) => void;
  showDeviceSelector: boolean;
  setShowDeviceSelector: (show: boolean) => void;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceType, setDeviceTypeState] = useState<DeviceType>(() => {
    const saved = localStorage.getItem('device-type');
    return (saved as DeviceType) || null;
  });
  const [showDeviceSelector, setShowDeviceSelector] = useState(() => {
    return !localStorage.getItem('device-type');
  });

  useEffect(() => {
    if (deviceType) {
      document.documentElement.setAttribute('data-device', deviceType);
    }
  }, [deviceType]);

  const setDeviceType = (type: DeviceType) => {
    if (type) {
      localStorage.setItem('device-type', type);
      document.documentElement.setAttribute('data-device', type);
      setDeviceTypeState(type);
      setShowDeviceSelector(false);
    }
  };

  return (
    <DeviceContext.Provider value={{ deviceType, setDeviceType, showDeviceSelector, setShowDeviceSelector }}>
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};
