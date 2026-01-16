"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation"; // New
import { useAppContext } from "./context/AppContext"; // New
import UniversalUploader from "./components/UniversalUploader";
import BrandInput from "./components/BrandInput";
import AspectRatioSelector from "./components/AspectRatioSelector"; // New
import InvitationCodeModal from "./components/InvitationCodeModal";

export default function Home() {
  const router = useRouter();
  const { state, dispatch } = useAppContext();
  const { pdfData, brandInfo, aspectRatio } = state;

  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState(null);
  const [apiAvailable, setApiAvailable] = useState(null);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    // Check session verification
    const verified = sessionStorage.getItem("isVerified"); // Simple session check
    if (verified === "true") {
      setIsVerified(true);
    }

    async function checkApi() {
      try {
        const response = await fetch("/api/generate-image");
        const data = await response.json();
        setApiAvailable(data.available);
      } catch {
        setApiAvailable(false);
      }
    }
    checkApi();
  }, []);

  // Update step based on state
  useEffect(() => {
    if (brandInfo) setCurrentStep(3);
    else if (pdfData) setCurrentStep(2);
    else setCurrentStep(1);
  }, [pdfData, brandInfo]);

  const handleVerified = () => {
    sessionStorage.setItem("isVerified", "true");
    setIsVerified(true);
  };

  const handleLoaded = useCallback((data) => {
    dispatch({ type: "SET_PDF_DATA", payload: data });
    setError(null);
  }, [dispatch]);

  const handleBrandLoaded = useCallback((brand) => {
    dispatch({ type: "SET_BRAND_INFO", payload: brand });
    setError(null);
  }, [dispatch]);

  const handleRatioSelect = useCallback((ratio) => {
    dispatch({ type: "SET_ASPECT_RATIO", payload: ratio });
  }, [dispatch]);

  const handleRemoveData = useCallback(() => {
    dispatch({ type: "RESET" });
    setError(null);
  }, [dispatch]);

  const handleStartProcessing = () => {
    if (!pdfData || !brandInfo) return;

    if (!apiAvailable) {
      setError("从环境配置中未检测到 Gemini API 密钥");
      return;
    }

    // Navigate to redraw page
    router.push("/redraw");
  };

  const canStartProcessing = pdfData && brandInfo;

  // Render appropriate badge for file type
  const renderFileBadge = () => {
    if (!pdfData) return null;
    // Heuristic: check if fileName ends with .pdf or has pages > 1 but derived from PDF
    const isPDF = pdfData.fileName.toLowerCase().endsWith('.pdf');

    return (
      <div style={{
        width: '36px', height: '36px',
        background: isPDF ? 'linear-gradient(180deg, #FF3B30 0%, #FF2D55 100%)' : 'linear-gradient(180deg, #30D158 0%, #30B058 100%)',
        borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 2px 8px ${isPDF ? 'rgba(255, 59, 48, 0.3)' : 'rgba(48, 209, 88, 0.3)'}`
      }}>
        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '9px' }}>
          {isPDF ? 'PDF' : 'IMG'}
        </span>
      </div>
    );
  };

  return (
    <main className="main-container">
      {!isVerified && <InvitationCodeModal onUnlock={handleVerified} />}

      {/* Header */}
      <header className="header">
        <div className="logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="4" width="20" height="16" rx="4" fill="url(#paint0_linear_logo)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
            <circle cx="8" cy="12" r="3" fill="rgba(255,255,255,0.9)" />
            <path d="M14 10H18" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M14 14H18" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" />
            <defs>
              <linearGradient id="paint0_linear_logo" x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
                <stop stopColor="#2997FF" />
                <stop offset="1" stopColor="#A259FF" />
              </linearGradient>
            </defs>
          </svg>
          <span className="logo-text">PPT AI Pro</span>
        </div>
      </header>

      {/* Hero */}
      {!pdfData && (
        <section className="hero animate-fade-in">
          <h1>重塑大师级杰作</h1>
          <p>智能解构文档，注入 NANO BANANA PRO 的设计灵感。</p>
        </section>
      )}

      {/* API Warning */}
      {apiAvailable === false && (
        <div className="step active" style={{ background: 'rgba(255, 69, 58, 0.1)', color: '#FF453A', borderColor: '#FF453A', justifyContent: 'center' }}>
          需配置 API 密钥
        </div>
      )}

      {/* Steps */}
      {pdfData && (
        <div className="steps animate-fade-in">
          <div className={`step ${currentStep >= 1 ? (currentStep > 1 ? "completed" : "active") : ""}`}>
            <span className="step-number">1</span>
            <span>上传</span>
          </div>
          <div className={`step ${currentStep >= 2 ? (currentStep > 2 ? "completed" : "active") : ""}`}>
            <span className="step-number">2</span>
            <span>品牌</span>
          </div>
          <div className={`step ${currentStep >= 3 ? (currentStep > 3 ? "completed" : "active") : ""}`}>
            <span className="step-number">3</span>
            <span>比例</span>
          </div>
        </div>
      )}

      {/* 1. Upload Section */}
      <section className={`card animate-fade-in ${pdfData ? 'compact' : ''}`}>
        {!pdfData ? (
          <UniversalUploader onLoaded={handleLoaded} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {renderFileBadge()}
              <div>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>{pdfData.fileName}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{pdfData.totalPages} 页 · 就绪</p>
              </div>
            </div>
            <button
              onClick={handleRemoveData}
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)',
                padding: '6px 12px', borderRadius: '14px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              更换
            </button>
          </div>
        )}
      </section>

      {/* 2. Brand Section */}
      {pdfData && (
        <section className="card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="card-title" style={{ fontSize: '15px', marginBottom: '12px' }}>
            <span>🎨</span> 品牌识别
          </div>
          <BrandInput onBrandLoaded={handleBrandLoaded} initialValue={brandInfo ? brandInfo.name : ""} />
        </section>
      )}

      {/* 3. Aspect Ratio Selection (New) */}
      {pdfData && brandInfo && (
        <section className="card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="card-title" style={{ fontSize: '15px', marginBottom: '12px' }}>
            <span>📐</span> 画面比例
          </div>
          <AspectRatioSelector selected={aspectRatio} onSelect={handleRatioSelect} />
        </section>
      )}

      {/* 4. Action */}
      {pdfData && brandInfo && (
        <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <button
            className="start-button"
            onClick={handleStartProcessing}
            disabled={!canStartProcessing}
          >
            进入大师工坊 ({pdfData.totalPages} 页)
          </button>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(28,28,30,0.8)', backdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)', padding: '10px 20px', borderRadius: '99px',
          color: 'var(--accent-error)', fontSize: '13px', fontWeight: '500',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100
        }}>
          {error}
        </div>
      )}
    </main>
  );
}
