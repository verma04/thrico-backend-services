import { log } from '@thrico/logging';

// Country data - ISO 3166-1 alpha-2 codes with details
const COUNTRIES = [
  { code: 'IN', name: 'India', currency: 'INR', taxName: 'GST', taxPercentage: 18, taxType: 'VAT', taxIncluded: false },
  { code: 'US', name: 'United States', currency: 'USD', taxName: 'Sales Tax', taxPercentage: 7, taxType: 'Sales Tax', taxIncluded: false },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', taxName: 'VAT', taxPercentage: 5, taxType: 'VAT', taxIncluded: true },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', taxName: 'VAT', taxPercentage: 20, taxType: 'VAT', taxIncluded: true },
  { code: 'CA', name: 'Canada', currency: 'CAD', taxName: 'GST', taxPercentage: 5, taxType: 'VAT', taxIncluded: false },
  { code: 'AU', name: 'Australia', currency: 'AUD', taxName: 'GST', taxPercentage: 10, taxType: 'VAT', taxIncluded: true },
  { code: 'SG', name: 'Singapore', currency: 'SGD', taxName: 'GST', taxPercentage: 7, taxType: 'VAT', taxIncluded: false },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', taxName: 'SST', taxPercentage: 6, taxType: 'Sales Tax', taxIncluded: false },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', taxName: 'VAT', taxPercentage: 15, taxType: 'VAT', taxIncluded: true },
  { code: 'QA', name: 'Qatar', currency: 'QAR', taxName: 'VAT', taxPercentage: 5, taxType: 'VAT', taxIncluded: true },
  { code: 'KW', name: 'Kuwait', currency: 'KWD', taxName: 'K-Tax', taxPercentage: 0, taxType: 'VAT', taxIncluded: true },
  { code: 'BH', name: 'Bahrain', currency: 'BHD', taxName: 'VAT', taxPercentage: 10, taxType: 'VAT', taxIncluded: true },
  { code: 'OM', name: 'Oman', currency: 'OMR', taxName: 'VAT', taxPercentage: 5, taxType: 'VAT', taxIncluded: true },
  { code: 'DE', name: 'Germany', currency: 'EUR', taxName: 'VAT', taxPercentage: 19, taxType: 'VAT', taxIncluded: true },
  { code: 'FR', name: 'France', currency: 'EUR', taxName: 'VAT', taxPercentage: 20, taxType: 'VAT', taxIncluded: true },
  { code: 'IT', name: 'Italy', currency: 'EUR', taxName: 'VAT', taxPercentage: 22, taxType: 'VAT', taxIncluded: true },
  { code: 'ES', name: 'Spain', currency: 'EUR', taxName: 'VAT', taxPercentage: 21, taxType: 'VAT', taxIncluded: true },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', taxName: 'VAT', taxPercentage: 21, taxType: 'VAT', taxIncluded: true },
  { code: 'BE', name: 'Belgium', currency: 'EUR', taxName: 'VAT', taxPercentage: 21, taxType: 'VAT', taxIncluded: true },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', taxName: 'VAT', taxPercentage: 7.7, taxType: 'VAT', taxIncluded: true },
  { code: 'SE', name: 'Sweden', currency: 'SEK', taxName: 'VAT', taxPercentage: 25, taxType: 'VAT', taxIncluded: true },
  { code: 'NO', name: 'Norway', currency: 'NOK', taxName: 'VAT', taxPercentage: 25, taxType: 'VAT', taxIncluded: true },
  { code: 'DK', name: 'Denmark', currency: 'DKK', taxName: 'VAT', taxPercentage: 25, taxType: 'VAT', taxIncluded: true },
  { code: 'FI', name: 'Finland', currency: 'EUR', taxName: 'VAT', taxPercentage: 24, taxType: 'VAT', taxIncluded: true },
  { code: 'PL', name: 'Poland', currency: 'PLN', taxName: 'VAT', taxPercentage: 23, taxType: 'VAT', taxIncluded: true },
  { code: 'IE', name: 'Ireland', currency: 'EUR', taxName: 'VAT', taxPercentage: 23, taxType: 'VAT', taxIncluded: true },
  { code: 'PT', name: 'Portugal', currency: 'EUR', taxName: 'VAT', taxPercentage: 23, taxType: 'VAT', taxIncluded: true },
  { code: 'AT', name: 'Austria', currency: 'EUR', taxName: 'VAT', taxPercentage: 20, taxType: 'VAT', taxIncluded: true },
  { code: 'GR', name: 'Greece', currency: 'EUR', taxName: 'VAT', taxPercentage: 24, taxType: 'VAT', taxIncluded: true },
  { code: 'CZ', name: 'Czech Republic', currency: 'CZK', taxName: 'VAT', taxPercentage: 21, taxType: 'VAT', taxIncluded: true },
  { code: 'HU', name: 'Hungary', currency: 'HUF', taxName: 'VAT', taxPercentage: 27, taxType: 'VAT', taxIncluded: true },
  { code: 'RO', name: 'Romania', currency: 'RON', taxName: 'VAT', taxPercentage: 19, taxType: 'VAT', taxIncluded: true },
  { code: 'BG', name: 'Bulgaria', currency: 'BGN', taxName: 'VAT', taxPercentage: 20, taxType: 'VAT', taxIncluded: true },
  { code: 'JP', name: 'Japan', currency: 'JPY', taxName: 'Consumption Tax', taxPercentage: 10, taxType: 'Sales Tax', taxIncluded: false },
  { code: 'CN', name: 'China', currency: 'CNY', taxName: 'VAT', taxPercentage: 13, taxType: 'VAT', taxIncluded: true },
  { code: 'KR', name: 'South Korea', currency: 'KRW', taxName: 'VAT', taxPercentage: 10, taxType: 'VAT', taxIncluded: true },
  { code: 'TW', name: 'Taiwan', currency: 'TWD', taxName: 'VAT', taxPercentage: 5, taxType: 'VAT', taxIncluded: true },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD', taxName: 'None', taxPercentage: 0, taxType: 'None', taxIncluded: true },
  { code: 'TH', name: 'Thailand', currency: 'THB', taxName: 'VAT', taxPercentage: 7, taxType: 'VAT', taxIncluded: true },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', taxName: 'VAT', taxPercentage: 11, taxType: 'VAT', taxIncluded: true },
  { code: 'PH', name: 'Philippines', currency: 'PHP', taxName: 'VAT', taxPercentage: 12, taxType: 'VAT', taxIncluded: true },
  { code: 'VN', name: 'Vietnam', currency: 'VND', taxName: 'VAT', taxPercentage: 10, taxType: 'VAT', taxIncluded: true },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', taxName: 'GST', taxPercentage: 15, taxType: 'VAT', taxIncluded: true },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', taxName: 'VAT', taxPercentage: 15, taxType: 'VAT', taxIncluded: true },
  { code: 'BR', name: 'Brazil', currency: 'BRL', taxName: 'ICMS', taxPercentage: 18, taxType: 'VAT', taxIncluded: true },
  { code: 'MX', name: 'Mexico', currency: 'MXN', taxName: 'IVA', taxPercentage: 16, taxType: 'VAT', taxIncluded: true },
  { code: 'AR', name: 'Argentina', currency: 'ARS', taxName: 'IVA', taxPercentage: 21, taxType: 'VAT', taxIncluded: true },
  { code: 'CL', name: 'Chile', currency: 'CLP', taxName: 'IVA', taxPercentage: 19, taxType: 'VAT', taxIncluded: true },
  { code: 'CO', name: 'Colombia', currency: 'COP', taxName: 'IVA', taxPercentage: 19, taxType: 'VAT', taxIncluded: true },
  { code: 'PE', name: 'Peru', currency: 'PEN', taxName: 'IGV', taxPercentage: 18, taxType: 'VAT', taxIncluded: true },
  { code: 'EG', name: 'Egypt', currency: 'EGP', taxName: 'VAT', taxPercentage: 14, taxType: 'VAT', taxIncluded: true },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', taxName: 'VAT', taxPercentage: 7.5, taxType: 'VAT', taxIncluded: true },
  { code: 'KE', name: 'Kenya', currency: 'KES', taxName: 'VAT', taxPercentage: 16, taxType: 'VAT', taxIncluded: true },
  { code: 'TR', name: 'Turkey', currency: 'TRY', taxName: 'KDV', taxPercentage: 18, taxType: 'VAT', taxIncluded: true },
  { code: 'IL', name: 'Israel', currency: 'ILS', taxName: 'VAT', taxPercentage: 17, taxType: 'VAT', taxIncluded: true },
  { code: 'RU', name: 'Russia', currency: 'RUB', taxName: 'VAT', taxPercentage: 20, taxType: 'VAT', taxIncluded: true },
  { code: 'UA', name: 'Ukraine', currency: 'UAH', taxName: 'VAT', taxPercentage: 20, taxType: 'VAT', taxIncluded: true },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', taxName: 'GST', taxPercentage: 17, taxType: 'VAT', taxIncluded: true },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', taxName: 'VAT', taxPercentage: 15, taxType: 'VAT', taxIncluded: true },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR', taxName: 'VAT', taxPercentage: 15, taxType: 'VAT', taxIncluded: true },
  { code: 'NP', name: 'Nepal', currency: 'NPR', taxName: 'VAT', taxPercentage: 13, taxType: 'VAT', taxIncluded: true },
];

/**
 * Country Service Implementation
 * Provides methods for retrieving country information
 */
export const countryService = {
  /**
   * Get all countries
   */
  GetAllCountries: (call: any, callback: any) => {
    try {
      log.info('GetAllCountries called');
      
      const response = {
        countries: COUNTRIES.map(c => ({ code: c.code, name: c.name })),
      };
      
      callback(null, response);
    } catch (error: any) {
      log.error('Error in GetAllCountries', { error: error.message });
      callback(error);
    }
  },

  /**
   * Get country details by code
   */
  GetCountryDetails: (call: any, callback: any) => {
    try {
      const { code } = call.request;
      log.info('GetCountryDetails called', { code });
      
      const country = COUNTRIES.find(c => c.code === code);
      
      if (!country) {
        callback({
          code: 5, // NOT_FOUND
          message: `Country with code ${code} not found`,
        });
        return;
      }
      
      callback(null, country);
    } catch (error: any) {
      log.error('Error in GetCountryDetails', { error: error.message });
      callback(error);
    }
  },
};
