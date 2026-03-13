/**
 * Type declarations for Chrome Extension API
 * Extends the @types/chrome package
 */

declare namespace chrome {
  namespace alarms {
    interface Alarm {
      name: string;
      scheduledTime: number;
      periodInMinutes?: number;
    }
    
    function create(name: string, alarmInfo: {
      when?: number;
      delayInMinutes?: number;
      periodInMinutes?: number;
    }): void;
    
    function create(alarmInfo: {
      when?: number;
      delayInMinutes?: number;
      periodInMinutes?: number;
    }): void;
    
    function get(name: string): Promise<Alarm | undefined>;
    function getAll(): Promise<Alarm[]>;
    function clear(name: string): Promise<boolean>;
    function clearAll(): Promise<boolean>;
    
    const onAlarm: {
      addListener(callback: (alarm: Alarm) => void): void;
      removeListener(callback: (alarm: Alarm) => void): void;
    };
  }
}

export {};
