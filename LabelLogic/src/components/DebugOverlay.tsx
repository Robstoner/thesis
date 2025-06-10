import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

interface DebugMessage {
  timestamp: Date;
  message: string;
  type: 'info' | 'error' | 'success';
}

class DebugLogger {
  private listeners: ((messages: DebugMessage[]) => void)[] = [];
  private messages: DebugMessage[] = [];

  addListener(callback: (messages: DebugMessage[]) => void) {
    this.listeners.push(callback);
    callback(this.messages);
  }

  removeListener(callback: (messages: DebugMessage[]) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  log(message: string, type: 'info' | 'error' | 'success' = 'info') {
    const debugMessage: DebugMessage = {
      timestamp: new Date(),
      message,
      type
    };
    
    this.messages.push(debugMessage);
    
    // Keep only last 50 messages
    if (this.messages.length > 50) {
      this.messages = this.messages.slice(-50);
    }
    
    // Notify all listeners
    this.listeners.forEach(listener => listener(this.messages));
    
    // Also log to console (if it works)
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  clear() {
    this.messages = [];
    this.listeners.forEach(listener => listener(this.messages));
  }
}

export const debugLogger = new DebugLogger();

interface DebugOverlayProps {
  visible: boolean;
  onClose: () => void;
}

export default function DebugOverlay({ visible, onClose }: DebugOverlayProps) {
  const [messages, setMessages] = useState<DebugMessage[]>([]);

  useEffect(() => {
    if (visible) {
      debugLogger.addListener(setMessages);
      return () => debugLogger.removeListener(setMessages);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Debug Log</Text>
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.clearButton} onPress={() => debugLogger.clear()}>
              <Text style={styles.buttonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView style={styles.logContainer}>
          {messages.map((msg, index) => (
            <View key={index} style={[styles.logItem, styles[`${msg.type}Item`]]}>
              <Text style={styles.timestamp}>
                {msg.timestamp.toLocaleTimeString()}
              </Text>
              <Text style={styles.message}>{msg.message}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 1000,
  },
  container: {
    flex: 1,
    margin: 20,
    marginTop: 50,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  clearButton: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  closeButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  logContainer: {
    flex: 1,
    padding: 10,
  },
  logItem: {
    padding: 8,
    marginVertical: 2,
    borderRadius: 4,
    borderLeftWidth: 3,
  },
  infoItem: {
    backgroundColor: '#f8f9fa',
    borderLeftColor: '#007bff',
  },
  errorItem: {
    backgroundColor: '#f8d7da',
    borderLeftColor: '#dc3545',
  },
  successItem: {
    backgroundColor: '#d4edda',
    borderLeftColor: '#28a745',
  },
  timestamp: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
  },
  message: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
});