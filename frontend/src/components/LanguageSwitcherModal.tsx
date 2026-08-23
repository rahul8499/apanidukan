import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, RefreshCw, Check, Sparkles, X } from 'lucide-react'

interface LanguageSwitcherModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LanguageSwitcherModal({ isOpen, onClose }: LanguageSwitcherModalProps) {
  const { i18n, t } = useTranslation()
  const [isChanging, setIsChanging] = useState(false)
  const [targetLangName, setTargetLangName] = useState('')

  if (!isOpen && !isChanging) return null

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🚩' },
  ]

  const handleLanguageSelect = (langCode: string, langName: string) => {
    if (i18n.language === langCode) {
      onClose()
      return
    }

    setTargetLangName(langName)
    setIsChanging(true)

    setTimeout(() => {
      i18n.changeLanguage(langCode)
      localStorage.setItem('app_language', langCode)
      setTimeout(() => {
        setIsChanging(false)
        onClose()
      }, 400)
    }, 600)
  }

  return (
    <>
      {/* Full-Page Loading Spinner Overlay when switching language */}
      {isChanging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-4 rounded-3xl border border-amber-400/40 bg-slate-900/90 shadow-2xl max-w-sm mx-auto">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/10 border border-amber-400/40 text-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.3)]">
              <RefreshCw className="h-8 w-8 animate-spin text-amber-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white flex items-center justify-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-400 fill-amber-400" /> {t('switchingLanguage')}
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Loading UI translations for <span className="text-amber-300 font-extrabold">{targetLangName}</span>...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Language Selection Modal */}
      {isOpen && !isChanging && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{t('selectLanguage')}</h3>
                  <p className="text-[11px] text-slate-400 font-medium">English • हिंदी • मराठी Vernacular Support</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {languages.map((lang) => {
                const isActive = i18n.language === lang.code
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageSelect(lang.code, lang.nativeName)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isActive
                        ? 'border-amber-400/80 bg-amber-400/10 text-white shadow-[0_0_15px_rgba(251,191,36,0.15)] font-black'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{lang.flag}</span>
                      <div className="text-left">
                        <p className="text-sm font-extrabold">{lang.nativeName}</p>
                        <p className="text-[10px] text-slate-400">{lang.name}</p>
                      </div>
                    </div>

                    {isActive && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-slate-950">
                        <Check className="h-4 w-4 stroke-[3]" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 text-center">
              <p className="text-[10px] text-slate-400">
                Translations apply instantly across storefront, cart, checkout & seller controls.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
