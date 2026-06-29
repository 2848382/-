import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { InputDialog } from '../components/ui/InputDialog';

interface DialogContextType {
  confirm: (options: { title: string; message: string; confirmText?: string; cancelText?: string; isDestructive?: boolean }) => Promise<boolean>;
  prompt: (options: { title: string; message: string; defaultValue?: string; placeholder?: string; confirmText?: string; cancelText?: string }) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    resolve?: (value: boolean) => void;
  }>({ isOpen: false, title: '', message: '' });

  const [inputState, setInputState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    defaultValue?: string;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
    resolve?: (value: string | null) => void;
  }>({ isOpen: false, title: '', message: '' });

  const confirm = (options: { title: string; message: string; confirmText?: string; cancelText?: string; isDestructive?: boolean }) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        ...options,
        isOpen: true,
        resolve
      });
    });
  };

  const prompt = (options: { title: string; message: string; defaultValue?: string; placeholder?: string; confirmText?: string; cancelText?: string }) => {
    return new Promise<string | null>((resolve) => {
      setInputState({
        ...options,
        isOpen: true,
        resolve
      });
    });
  };

  const handleConfirmConfirm = () => {
    confirmState.resolve?.(true);
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfirmCancel = () => {
    confirmState.resolve?.(false);
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  };

  const handleInputConfirm = (value: string) => {
    inputState.resolve?.(value);
    setInputState(prev => ({ ...prev, isOpen: false }));
  };

  const handleInputCancel = () => {
    inputState.resolve?.(null);
    setInputState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        isDestructive={confirmState.isDestructive}
        onConfirm={handleConfirmConfirm}
        onCancel={handleConfirmCancel}
      />
      <InputDialog
        isOpen={inputState.isOpen}
        title={inputState.title}
        message={inputState.message}
        defaultValue={inputState.defaultValue}
        placeholder={inputState.placeholder}
        confirmText={inputState.confirmText}
        cancelText={inputState.cancelText}
        onConfirm={handleInputConfirm}
        onCancel={handleInputCancel}
      />
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useDialog must be used within DialogProvider');
  return context;
};
