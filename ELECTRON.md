# Como rodar e compilar o Electron

## Pré-requisitos
- Node.js 18+ instalado: https://nodejs.org

## Instalação

```bash
npm install
```

## Rodar em desenvolvimento

```bash
# Modo completo (todos os módulos)
npm start

# Modo por estação
npx electron . --mode=totem
npx electron . --mode=painel
npx electron . --mode=operador
npx electron . --mode=admin

# Com DevTools aberto
npx electron . --mode=totem --dev
```

## Gerar instalador Windows (.exe)

```bash
npm run build
```

O instalador será gerado em `dist/BALCÃO Senhas Setup.exe`.

## Atalhos recomendados por estação

Crie atalhos no Desktop apontando para o executável instalado com os argumentos:

| Estação    | Argumento        |
|------------|------------------|
| Totem      | `--mode=totem`   |
| Painel     | `--mode=painel`  |
| Operador   | `--mode=operador`|
| Admin      | `--mode=admin`   |

## Detecção de papel (K80 Tornado)

O Electron conecta automaticamente à impressora via porta serial (RS232 ou USB/COM virtual).
A detecção ocorre a cada 5 segundos via comando ESC/POS `DLE EOT`.

Se a impressora não for encontrada automaticamente, verifique:
1. O driver da K80 está instalado
2. A impressora aparece no Gerenciador de Dispositivos como porta COM
3. O cabo USB ou serial está conectado
