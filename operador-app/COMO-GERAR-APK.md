# Como Gerar o APK — Painel de senha do Ni (Operador)

## Pré-requisitos

1. **Android Studio** — baixe em https://developer.android.com/studio
   - Durante a instalação, aceite instalar o Android SDK
   - SDK mínimo necessário: Android 5.0 (API 22)

2. **Java 11+** — o Android Studio já instala automaticamente

---

## Passo 1 — Abrir o projeto no Android Studio

Após instalar o Android Studio, abra esta pasta:

```
operador-app/android/
```

No Android Studio: **File → Open** → selecione a pasta `android/`

---

## Passo 2 — Aguardar sincronização do Gradle

O Android Studio vai baixar as dependências automaticamente (pode demorar alguns minutos na primeira vez).

---

## Passo 3 — Gerar o APK de debug (para testar)

No menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

O APK será gerado em:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Passo 4 — Gerar o APK de release (para distribuir)

No menu: **Build → Generate Signed Bundle / APK**
- Escolha **APK**
- Crie uma keystore (ou use uma existente)
- Escolha **release**

O APK será gerado em:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## Configurar o IP do servidor

Antes de instalar o APK no celular, edite o arquivo:
```
www/index.html
```

Procure por `SERVER_IP` ou `localhost` e substitua pelo IP do computador
onde o servidor está rodando (ex: `192.168.1.100`).

Depois rode novamente:
```
node scripts/build.js
npx cap sync android
```

E gere o APK novamente.

---

## Estrutura do projeto

```
operador-app/
├── www/                    ← Arquivos web (gerados pelo build.js)
│   └── index.html          ← mobile.html copiado aqui
├── android/                ← Projeto Android (abrir no Android Studio)
├── capacitor.config.json   ← Configurações do Capacitor
├── scripts/
│   └── build.js            ← Script que copia mobile.html → www/
└── COMO-GERAR-APK.md       ← Este arquivo
```
