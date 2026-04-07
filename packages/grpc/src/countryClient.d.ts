export interface Country {
    code: string;
    name: string;
}
export interface CountryDetails {
    code: string;
    name: string;
    currency: string;
    taxName: string;
    taxPercentage: number;
    taxType: string;
    taxIncluded: boolean;
}
declare class CountryClient {
    private client;
    private isConnected;
    constructor();
    getAllCountries(): Promise<Country[]>;
    getCountryDetails(code: string): Promise<CountryDetails>;
    close(): void;
}
export declare const countryClient: CountryClient;
export default CountryClient;
//# sourceMappingURL=countryClient.d.ts.map