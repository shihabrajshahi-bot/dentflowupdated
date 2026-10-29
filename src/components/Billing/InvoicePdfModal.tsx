import React from 'react';
import { InvoicePreviewModal, InvoicePreviewModalProps } from './InvoicePreviewModal';

export type InvoicePdfModalProps = InvoicePreviewModalProps;

export const InvoicePdfModal: React.FC<InvoicePdfModalProps> = (props) => {
  return <InvoicePreviewModal {...props} />;
};

export default InvoicePdfModal;
