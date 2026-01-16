"use client";

import { createContext, useContext, useState, useReducer } from "react";

const AppContext = createContext();

const initialState = {
    pdfData: null,
    brandInfo: null,
    aspectRatio: "16:9", // Default
};

function appReducer(state, action) {
    switch (action.type) {
        case "SET_PDF_DATA":
            return { ...state, pdfData: action.payload };
        case "SET_BRAND_INFO":
            return { ...state, brandInfo: action.payload };
        case "SET_ASPECT_RATIO":
            return { ...state, aspectRatio: action.payload };
        case "RESET":
            return initialState;
        default:
            return state;
    }
}

export function AppProvider({ children }) {
    const [state, dispatch] = useReducer(appReducer, initialState);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    return useContext(AppContext);
}
