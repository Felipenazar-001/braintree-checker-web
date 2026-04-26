// Tabela de retornos LIVE por banco, bandeira e BIN
// Formato: BIN -> { bandeira -> [retornos esperados] }

export interface BankInfo {
  name: string;
  visa?: string[];
  mastercard?: string[];
  elo?: string[];
  amex?: string[];
  mastercard_electron?: string[];
  mastercard_business?: string[];
  hipercard?: string[];
}

export const cardReturnsDatabase: Record<string, BankInfo> = {
  // BANCO DO BRASIL
  "001": {
    name: "BANCO DO BRASIL",
    visa: ["N7"],
    mastercard: ["12"],
    elo: ["63"],
  },
  // BANCO MASTER
  "043": {
    name: "BANCO MASTER, S.A.",
    visa: ["N7"],
  },
  // BANCO PORTOSEGURO
  "062": {
    name: "BANCO PORTOSEGURO",
    visa: ["N7"],
    mastercard: ["12", "83"],
  },
  // BANCO CAIXA ECONÔMICA
  "104": {
    name: "BANCO CAIXA ECONÔMICA",
    visa: ["N7"],
    elo: ["63"],
  },
  // BANCO PERNAMBUCANAS
  "108": {
    name: "BANCO PERNAMBUCANAS",
    elo: ["63"],
  },
  // BANCO PAN
  "237": {
    name: "BANCO PAN",
    visa: ["N7"],
    mastercard: ["83"],
    elo: ["63"],
  },
  // BANCO SICREDI
  "748": {
    name: "BANCO SICREDI",
    visa: ["N7"],
    mastercard: ["83"],
  },
  // BANCO SANTANDER
  "033": {
    name: "BANCO SANTANDER",
    visa: ["N7"],
    mastercard: ["12", "83"],
  },
  // BANCO BRB
  "070": {
    name: "BANCO BRB",
    visa: ["07", "N7"],
    mastercard: ["12", "83"],
  },
  // BANCO BRADESCO
  "029": {
    name: "BANCO BRADESCO",
    visa: ["N7", "54"],
    mastercard: ["12"],
    elo: ["54"],
  },
  // BANCO ITAU
  "341": {
    name: "BANCO ITAU",
    visa: ["82", "N7"],
    mastercard: ["88", "70"],
    mastercard_electron: ["82", "70"],
    mastercard_business: ["12", "83"],
    hipercard: ["70"],
  },
  // BANCO BANRISUL
  "047": {
    name: "BANCO BANRISUL",
    visa: ["N7"],
    mastercard: ["82"],
  },
  // BANCO SICOOB
  "756": {
    name: "BANCO SICOOB",
    visa: ["82", "N7"],
  },
  // BANCO ROYAL BANK OF CANADA
  "633": {
    name: "BANCO ROYAL BANK OF CANADA",
    visa: ["N7", "82"],
    mastercard: ["54"],
  },
  // BANCO AMERICAN EXPRESS
  "377": {
    name: "BANCO AMERICAN EXPRESS",
    amex: ["FA", "BV", "100", "A6"],
  },
};

// Função para detectar bandeira pelo BIN
export function detectCardBrand(cardNumber: string): "visa" | "mastercard" | "amex" | "elo" | "unknown" {
  const firstDigit = cardNumber.charAt(0);
  const firstTwoDigits = cardNumber.substring(0, 2);
  const firstThreeDigits = cardNumber.substring(0, 3);
  const firstFourDigits = cardNumber.substring(0, 4);
  const firstSixDigits = cardNumber.substring(0, 6);

  // AMEX: começa com 34 ou 37
  if (firstTwoDigits === "34" || firstTwoDigits === "37") {
    return "amex";
  }

  // VISA: começa com 4
  if (firstDigit === "4") {
    return "visa";
  }

  // MASTERCARD: começa com 51-55 ou 2221-2720
  if (
    (firstTwoDigits >= "51" && firstTwoDigits <= "55") ||
    (parseInt(firstFourDigits) >= 2221 && parseInt(firstFourDigits) <= 2720)
  ) {
    return "mastercard";
  }

  // ELO: começa com 4011, 4312, 4389, 4514, 4576, 5041, 5066-5099, 6362-6599
  const eloRanges = [
    "4011", "4312", "4389", "4514", "4576", "5041", "6362", "6363"
  ];
  if (eloRanges.includes(firstFourDigits) ||
      (firstFourDigits >= "5066" && firstFourDigits <= "5099") ||
      (firstFourDigits >= "6500" && firstFourDigits <= "6599")) {
    return "elo";
  }

  return "unknown";
}

// Função para obter banco pelo BIN
export function getBankByBin(cardNumber: string): (typeof cardReturnsDatabase)[keyof typeof cardReturnsDatabase] | null {
  const firstThreeDigits = cardNumber.substring(0, 3);
  const firstSixDigits = cardNumber.substring(0, 6);

  // Tenta primeiro com 6 dígitos, depois com 3
  return cardReturnsDatabase[firstSixDigits as keyof typeof cardReturnsDatabase] ||
    cardReturnsDatabase[firstThreeDigits as keyof typeof cardReturnsDatabase] ||
    null;
}

// Função para obter retornos esperados
export function getExpectedReturns(cardNumber: string): {
  bank: string | null;
  brand: string;
  expectedReturns: string[];
} {
  const brand = detectCardBrand(cardNumber);
  const bank = getBankByBin(cardNumber);

  let expectedReturns: string[] = [];

  if (bank) {
    if (brand === "visa" && bank.visa) {
      expectedReturns = bank.visa;
    } else if (brand === "mastercard" && bank.mastercard) {
      expectedReturns = bank.mastercard;
    } else if (brand === "elo" && bank.elo) {
      expectedReturns = bank.elo;
    } else if (brand === "amex" && bank.amex) {
      expectedReturns = bank.amex;
    }
  }

  return {
    bank: bank?.name || null,
    brand,
    expectedReturns,
  };
}

// Função para validar se um retorno é LIVE
export function isReturnLive(cardNumber: string, returnCode: string): boolean {
  const { expectedReturns } = getExpectedReturns(cardNumber);
  return expectedReturns.length > 0 && expectedReturns.includes(returnCode.toUpperCase());
}
