// Toss Payments API 타입 정의

export interface TossPaymentRequest {
  orderId: string;
  amount: number;
  orderName: string;
  customerName: string;
  customerEmail?: string;
  customerMobilePhone?: string;
}

export interface TossPaymentConfirm {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface TossPaymentResponse {
  version: string;
  paymentKey: string;
  type: 'NORMAL' | 'BILLING' | 'BRANDPAY';
  orderId: string;
  orderName: string;
  mId: string;
  currency: string;
  method: 'CARD' | 'VIRTUAL_ACCOUNT' | 'TRANSFER' | 'MOBILE_PHONE' | 'CULTURE_GIFT_CERTIFICATE' | 'FOREIGN_EASY_PAY';
  totalAmount: number;
  balanceAmount: number;
  status: 'READY' | 'IN_PROGRESS' | 'WAITING_FOR_DEPOSIT' | 'DONE' | 'CANCELED' | 'PARTIAL_CANCELED' | 'ABORTED' | 'EXPIRED';
  requestedAt: string;
  approvedAt: string;
  useEscrow: boolean;
  lastTransactionKey: string | null;
  suppliedAmount: number;
  vat: number;
  cultureExpense: boolean;
  taxFreeAmount: number;
  taxExemptionAmount: number;
  cancels: TossPaymentCancel[] | null;
  isPartialCancelable: boolean;
  card?: TossPaymentCard;
  virtualAccount?: TossPaymentVirtualAccount;
  transfer?: TossPaymentTransfer;
  mobilePhone?: TossPaymentMobilePhone;
  giftCertificate?: TossPaymentGiftCertificate;
  receipt: {
    url: string;
  };
  checkout: {
    url: string;
  };
  easyPay?: TossPaymentEasyPay;
  country: string;
  failure?: TossPaymentFailure;
  cashReceipt: TossPaymentCashReceipt | null;
  cashReceipts: TossPaymentCashReceipt[] | null;
  discount: TossPaymentDiscount | null;
}

export interface TossPaymentCard {
  amount: number;
  issuerCode: string;
  acquirerCode?: string;
  number: string;
  installmentPlanMonths: number;
  approveNo: string;
  useCardPoint: boolean;
  cardType: 'CREDIT' | 'CHECK' | 'GIFT';
  ownerType: 'PERSONAL' | 'CORPORATE';
  acquireStatus: 'READY' | 'REQUESTED' | 'COMPLETED' | 'CANCEL_REQUESTED' | 'CANCELED';
  isInterestFree: boolean;
  interestPayer: 'BUYER' | 'CARD_COMPANY' | 'MERCHANT' | null;
}

export interface TossPaymentCancel {
  cancelAmount: number;
  cancelReason: string;
  taxFreeAmount: number;
  taxExemptionAmount: number;
  refundableAmount: number;
  easyPayDiscountAmount: number;
  canceledAt: string;
  transactionKey: string;
  receiptKey: string | null;
}

export interface TossPaymentVirtualAccount {
  accountType: 'NORMAL' | 'FIXED';
  accountNumber: string;
  bankCode: string;
  customerName: string;
  dueDate: string;
  refundStatus: 'NONE' | 'PENDING' | 'FAILED' | 'COMPLETED';
  expired: boolean;
  settlementStatus: 'INCOMPLETE' | 'COMPLETE';
  refundReceiveAccount: {
    bankCode: string;
    accountNumber: string;
    holderName: string;
  } | null;
}

export interface TossPaymentTransfer {
  bankCode: string;
  settlementStatus: 'INCOMPLETE' | 'COMPLETE';
}

export interface TossPaymentMobilePhone {
  customerMobilePhone: string;
  settlementStatus: 'INCOMPLETE' | 'COMPLETE';
  receiptUrl: string;
}

export interface TossPaymentGiftCertificate {
  approveNo: string;
  settlementStatus: 'INCOMPLETE' | 'COMPLETE';
}

export interface TossPaymentEasyPay {
  provider: string;
  amount: number;
  discountAmount: number;
}

export interface TossPaymentFailure {
  code: string;
  message: string;
}

export interface TossPaymentCashReceipt {
  type: 'INCOME_DEDUCTION' | 'PROOF_OF_EXPENDITURE';
  receiptKey: string;
  issueNumber: string;
  receiptUrl: string;
  amount: number;
  taxFreeAmount: number;
}

export interface TossPaymentDiscount {
  amount: number;
}

export interface TossPaymentError {
  code: string;
  message: string;
}
