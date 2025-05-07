// src/lib/google-sheets.utils.ts
"use server";

import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from "google-spreadsheet"; // Import GoogleSpreadsheetWorksheet
import { JWT } from "google-auth-library";

export type SheetRowData = Record<string, string | number | boolean | null | undefined>;

// Define a more specific type for Google API errors if possible, or use a general approach
interface GoogleApiError extends Error {
    response?: {
        status?: number;
        data?: {
            error?: {
                message?: string;
                errors?: { message: string; domain: string; reason: string }[];
                code?: number;
                status?: string; // Sometimes status is here
            };
        };
    };
    status?: number; // Sometimes status is directly on the error object
    code?: number;   // Google API errors often have a 'code' property
}


export async function getGoogleSheet(
    sheetId: string,
    worksheetTitle: string,
    readOnly: boolean = true
): Promise<GoogleSpreadsheetWorksheet> { // Add return type
    console.log(`Utils: Attempting to get sheet '${worksheetTitle}' (ReadOnly: ${readOnly})`);

    const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !sheetId) {
        console.error("Utils Error: Missing Google credentials or Sheet ID.");
        throw new Error("Missing Google credentials or Sheet ID environment variables.");
    }

    const scopes = readOnly
        ? ["https://www.googleapis.com/auth/spreadsheets.readonly", "https://www.googleapis.com/auth/drive.readonly"]
        : ["https://www.googleapis.com/auth/spreadsheets"];

    // console.log("Utils: Using Scopes:", scopes); // Optional: for debugging

    let serviceAccountAuth: JWT;
    try {
        const formattedKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, "\n");
        if (!formattedKey) throw new Error("Formatted Private Key is empty.");

        serviceAccountAuth = new JWT({
            email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: formattedKey,
            scopes: scopes,
        });
        // console.log("Utils: JWT Auth object created."); // Optional: for debugging
    } catch (jwtError: unknown) { // Type jwtError as unknown
        console.error("Utils Error: Failed to create JWT Auth object:", jwtError);
        throw new Error(`Failed to initialize authentication: ${jwtError instanceof Error ? jwtError.message : String(jwtError)}`);
    }

    try {
        const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
        // console.log("Utils: Attempting to load spreadsheet info..."); // Optional: for debugging
        await doc.loadInfo();
        // console.log(`Utils: Spreadsheet info loaded: "${doc.title}"`); // Optional: for debugging

        const sheet = doc.sheetsByTitle[worksheetTitle];
        if (!sheet) {
            console.error(`Utils Error: Worksheet "${worksheetTitle}" not found in sheet ID "${sheetId}". Available:`, Object.keys(doc.sheetsByTitle));
            throw new Error(`Worksheet '${worksheetTitle}' not found.`);
        }
        // console.log(`Utils: Accessed worksheet: "${sheet.title}"`); // Optional: for debugging
        return sheet;

    } catch (apiError: unknown) { // Type apiError as unknown
        console.error(`Utils Error: Google API error during loadInfo or sheet access for '${worksheetTitle}':`, apiError);

        let errorMessage = 'Unknown Google API error';
        let statusCode: number | string | undefined = undefined;

        if (typeof apiError === 'object' && apiError !== null) {
            // Check if it's a GoogleApiError like structure (more robust check)
            const gError = apiError as GoogleApiError; // Cast after checks or use type guards

            if (gError.response && typeof gError.response === 'object') {
                statusCode = gError.response.status;
                if (gError.response.data && gError.response.data.error && typeof gError.response.data.error.message === 'string') {
                    errorMessage = `${gError.response.data.error.message} (Status: ${statusCode || 'N/A'})`;
                } else if (gError.response.status) { // Fallback if deeper message not found
                    errorMessage = `Request failed with status code ${gError.response.status}`;
                }
            } else if (typeof gError.message === 'string') { // Standard Error object
                errorMessage = gError.message;
                if (typeof gError.code === 'number') { // Google API specific error code
                    statusCode = gError.code;
                    errorMessage += ` (Code: ${gError.code})`;
                } else if (typeof gError.status === 'number') { // Some errors might have status directly
                    statusCode = gError.status;
                    errorMessage += ` (Status: ${gError.status})`;
                }
            } else {
                // If it's not an Error instance and has no message, try to stringify
                try {
                    errorMessage = JSON.stringify(apiError);
                } catch (apiError) {
                    errorMessage = String(apiError);
                }
            }
        } else if (typeof apiError === 'string') {
            errorMessage = apiError;
        }

        throw new Error(`Google API error [${statusCode ?? 'N/A'}]: ${errorMessage}`);
    }
}