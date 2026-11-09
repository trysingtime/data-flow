// Trace 7e1e6c7e021d4bba3fcbe615dadb161d, transfer_payment_service, test/hk
// SWIFT transfer b3b7ca8bddf54b0ba5b35efe49d6b838 (2026-11-06 17:35:04 -> 17:35:11)
// Projection of the fields that actually cross each stage. Constants and
// generated columns that do not carry data are listed in comments only.
// CommonRequest context (userId, commonChannelCode, commonSystemCode) is
// folded into the request node; it is not part of SwiftTransferCallRequest.

group Request [label="① 请求入参"] {
  node SwiftTransferCall {
    userId: Long
    commonChannelCode: String
    commonSystemCode: String
    transactionNo: String
    clientNo: String
    payerAccount: String
    payerCurrency: String
    payerAmount: Long
    payerName: String
    payeeName: String
    payeeRegionCode: String
    payeeAccountType: String
    payeeCustomerType: String
    payeeBicCode: String
    payeeAccount: String
    payeeCurrency: String
    payeeAmount: Long
    charge: Long
    chargeAllocation: String
    chargeAccount: String
    payeeAddrRegionCode: String
    payeeAddrRegionName: String
    payeeAddrDetail: String
    remark: String
    payeeHoldCnId: Boolean
    payeePhone: String
    payeeAccountTypeLocal: String
    payeePostalCode: String
    remittanceRelationship: String
  }
}

group PersistInsert [label="② 落库字段"] {
  node RemittanceRecordInsert {
    userId: Long
    transactionNo: String
    clientNo: String
    payerFullName: String
    payerAccount: String
    payeeAccount: String
    payeeAccountType: String
    payeeFullName: String
    payeeCustomerType: String
    payeeBicCode: String
    senderSendingCurrency: String
    senderSendingAmount: Long
    sendingCurrency: String
    sendingAmount: Long
    receivingCurrency: String
    receivingAmount: Long
    originalAmountCharge: Long
    amountCharge: Long
    chargeAccount: String
    chargeAllocation: String
    remark: String
    payeeCountry: String
    channelCode: String
    systemCode: String
    batchNumber: String
    createTime: Timestamp
  }

  node SubRemittanceRecordInsert {
    userId: Long
    transactionNo: String
    payeeAddrRegionCode: String
    payeeAddrRegionName: String
    payeeAddrDetail: String
    extInfo: String
  }
  // Generated/constant columns omitted here: transfer_type='swift',
  // transfer_date, remittance_status='submitted', fx_status='init',
  // hisun_transfer_status='init', trs_remittance_status='init', update_time.
}

group OutboundRequest [label="③ 请求出参"] {
  node HisunSwiftTransferRequest {
    serialNumber: String
    clientId: String
    payerAccount: String
    payerIbsAccount: String
    payerCurrency: String
    feeAccount: String
    feeCurrency: String
    feeAmount: Long
    remittanceCurrency: String
    remittanceAmount: Long
    payeeAccount: String
    payeeName: String
    payeeCountry: String
    payeeOpeningBank: String
    bankCharge: Integer
    remark1: String
    payeeAddrCountryCode: String
    payeeAddrDetail: String
  }
  // Constants omitted here: remittanceType='SW',
  // params.channel='EBK'/params.requestSystem='IBSEB' (buildEbkParams),
  // payeeOpeningBankOpt='A', payeeInfoType='N'.
}

group InboundResponse [label="④ 回应入参"] {
  node HisunSwiftTransferResponse {
    code: Integer
    errorCode: String
    paymentReference: String
    swiftReference: String
  }
}

group PersistUpdate [label="⑤ 落库字段"] {
  node RemittanceRecordUpdate {
    paymentReference: String
    transferListid: String
    hisunTransferStatus: String
  }
  // WHERE keys reused from ②: user_id, batch_number, transaction_no,
  // remittance_status='submitted', fx_status='init', trs_remittance_status='init'.
  // A first update sets hisun_transfer_status='pending' before the Hisun call;
  // this node shows the post-response update (success + references).
}

group Response [label="⑥ 请求出参"] {
  node SwiftTransferRsp {
    code: Integer
    status: String
    transactionNo: String
    batchNumber: String
    commitTime: Long
  }
  // Constants omitted here: subStatus='defaultPending', successTime=0,
  // needPolling=false, codeMsgId/statusAdditionMsgId/fxNextTransferTime empty.
}

// ① -> ② remittance_record_entity
SwiftTransferCall.userId -> RemittanceRecordInsert.userId
SwiftTransferCall.transactionNo -> RemittanceRecordInsert.transactionNo
SwiftTransferCall.clientNo -> RemittanceRecordInsert.clientNo
SwiftTransferCall.payerName -> RemittanceRecordInsert.payerFullName
SwiftTransferCall.payerAccount -> RemittanceRecordInsert.payerAccount
SwiftTransferCall.payeeAccount -> RemittanceRecordInsert.payeeAccount
SwiftTransferCall.payeeAccountType -> RemittanceRecordInsert.payeeAccountType
SwiftTransferCall.payeeName -> RemittanceRecordInsert.payeeFullName
SwiftTransferCall.payeeCustomerType -> RemittanceRecordInsert.payeeCustomerType
SwiftTransferCall.payeeBicCode -> RemittanceRecordInsert.payeeBicCode
SwiftTransferCall.payerCurrency -> RemittanceRecordInsert.senderSendingCurrency
SwiftTransferCall.payerAmount -> RemittanceRecordInsert.senderSendingAmount
SwiftTransferCall.payerCurrency -> RemittanceRecordInsert.sendingCurrency
SwiftTransferCall.payerAmount -> RemittanceRecordInsert.sendingAmount
SwiftTransferCall.payeeCurrency -> RemittanceRecordInsert.receivingCurrency
SwiftTransferCall.payeeAmount -> RemittanceRecordInsert.receivingAmount
SwiftTransferCall.charge -> RemittanceRecordInsert.originalAmountCharge
SwiftTransferCall.charge -> RemittanceRecordInsert.amountCharge
SwiftTransferCall.chargeAccount -> RemittanceRecordInsert.chargeAccount
SwiftTransferCall.chargeAllocation -> RemittanceRecordInsert.chargeAllocation
SwiftTransferCall.remark -> RemittanceRecordInsert.remark
SwiftTransferCall.payeeRegionCode -> RemittanceRecordInsert.payeeCountry
SwiftTransferCall.commonChannelCode -> RemittanceRecordInsert.channelCode
SwiftTransferCall.commonSystemCode -> RemittanceRecordInsert.systemCode

// ① -> ② sub_remittance_record_entity
SwiftTransferCall.userId -> SubRemittanceRecordInsert.userId
SwiftTransferCall.transactionNo -> SubRemittanceRecordInsert.transactionNo
SwiftTransferCall.payeeAddrRegionCode -> SubRemittanceRecordInsert.payeeAddrRegionCode
SwiftTransferCall.payeeAddrRegionName -> SubRemittanceRecordInsert.payeeAddrRegionName
SwiftTransferCall.payeeAddrDetail -> SubRemittanceRecordInsert.payeeAddrDetail
SwiftTransferCall.payeeHoldCnId -> SubRemittanceRecordInsert.extInfo
SwiftTransferCall.payeePhone -> SubRemittanceRecordInsert.extInfo
SwiftTransferCall.payeeAccountTypeLocal -> SubRemittanceRecordInsert.extInfo
SwiftTransferCall.payeePostalCode -> SubRemittanceRecordInsert.extInfo
SwiftTransferCall.remittanceRelationship -> SubRemittanceRecordInsert.extInfo

// ② -> ③ HisunSwiftTransferRequest
// batch_number is carried in memory by TransferBaseReq; ② is where it is
// first persisted. The edge means the same value is reused, not read back.
RemittanceRecordInsert.batchNumber -> HisunSwiftTransferRequest.serialNumber
SwiftTransferCall.clientNo -> HisunSwiftTransferRequest.clientId
SwiftTransferCall.payerAccount -> HisunSwiftTransferRequest.payerAccount
SwiftTransferCall.payerAccount -> HisunSwiftTransferRequest.payerIbsAccount
SwiftTransferCall.payerCurrency -> HisunSwiftTransferRequest.payerCurrency
SwiftTransferCall.chargeAccount -> HisunSwiftTransferRequest.feeAccount
SwiftTransferCall.payerCurrency -> HisunSwiftTransferRequest.feeCurrency
SwiftTransferCall.charge -> HisunSwiftTransferRequest.feeAmount
SwiftTransferCall.payerCurrency -> HisunSwiftTransferRequest.remittanceCurrency
SwiftTransferCall.payerAmount -> HisunSwiftTransferRequest.remittanceAmount
SwiftTransferCall.payeeAccount -> HisunSwiftTransferRequest.payeeAccount
SwiftTransferCall.payeeName -> HisunSwiftTransferRequest.payeeName
SwiftTransferCall.payeeRegionCode -> HisunSwiftTransferRequest.payeeCountry
SwiftTransferCall.payeeBicCode -> HisunSwiftTransferRequest.payeeOpeningBank
SwiftTransferCall.chargeAllocation -> HisunSwiftTransferRequest.bankCharge
SwiftTransferCall.remark -> HisunSwiftTransferRequest.remark1
SwiftTransferCall.payeeAddrRegionCode -> HisunSwiftTransferRequest.payeeAddrCountryCode
SwiftTransferCall.payeeAddrDetail -> HisunSwiftTransferRequest.payeeAddrDetail

// ③ -> ④ HisunSwiftTransferResponse
// Correlation only: the returned payment reference belongs to the request
// serial number; it is not a literal copy of the serial number.
HisunSwiftTransferRequest.serialNumber -> HisunSwiftTransferResponse.paymentReference

// ④ -> ⑤ remittance_record_entity update
HisunSwiftTransferResponse.paymentReference -> RemittanceRecordUpdate.paymentReference
HisunSwiftTransferResponse.swiftReference -> RemittanceRecordUpdate.transferListid
// errorCode 0000 is mapped to hisun_transfer_status='success'.
HisunSwiftTransferResponse.errorCode -> RemittanceRecordUpdate.hisunTransferStatus

// ⑤ -> ⑥ SwiftTransferRsp
// On the success branch the service sets code=ACCEPTED, status=PENDING,
// subStatus=DEFAULT_PENDING and commitTime=TransferBaseReq.createTime;
// the DB update is a side effect of the same branch.
RemittanceRecordUpdate.hisunTransferStatus -> SwiftTransferRsp.status
RemittanceRecordInsert.transactionNo -> SwiftTransferRsp.transactionNo
RemittanceRecordInsert.batchNumber -> SwiftTransferRsp.batchNumber
RemittanceRecordInsert.createTime -> SwiftTransferRsp.commitTime
HisunSwiftTransferResponse.code -> SwiftTransferRsp.code
