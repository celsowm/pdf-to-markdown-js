# Guia de Configuração - GitHub Pages Playground

## Como o Playground é Publicado

O playground é automaticamente publicado no GitHub Pages usando GitHub Actions toda vez que você faz push para a branch `main`.

## Configuração Inicial

### 1. Habilitar GitHub Pages no Repositório

1. Vá para o repositório no GitHub
2. Clique em **Settings** (Configurações)
3. No menu lateral, clique em **Pages**
4. Em **Source**, selecione **GitHub Actions** (não "Deploy from a branch")

### 2. Verificar o Workflow

O arquivo `.github/workflows/deploy.yml` já está configurado para:

- Build do projeto com `npm run build`
- Deploy da pasta `playground/` para o GitHub Pages
- Trigger automático em pushes para `main` ou `master`

### 3. Push para o GitHub

```bash
git add .
git commit -m "feat: add playground and multi-format build support"
git push origin main
```

### 4. Verificar o Deploy

1. Vá para a aba **Actions** no GitHub
2. Clique no workflow "Deploy Playground to GitHub Pages"
3. Verifique se o build e deploy foram concluídos com sucesso
4. O URL do playground será exibido nos logs do deploy

## URL do Playground

O playground estará disponível em:

```
https://SEU-USUARIO.github.io/pdf-to-markdown-js/playground/
```

## Troubleshooting

### O workflow não está executando

- Verifique se o arquivo `.github/workflows/deploy.yml` está no repositório
- Verifique se você fez push para a branch `main` ou `master`
- Verifique as permissões do repositório em Settings > Actions

### O deploy falhou

- Verifique os logs do workflow na aba Actions
- Certifique-se de que o comando `npm run build` está funcionando
- Verifique se a pasta `playground/` existe no repositório

### O playground não carrega

- Verifique o console do navegador para erros
- Certifique-se de que o arquivo `dist/index.min.js` está sendo gerado corretamente
- Verifique se os caminhos no `index.html` estão corretos

## Configuração Manual (Opcional)

Se você quiser configurar manualmente o GitHub Pages:

### Opção 1: Deploy da branch gh-pages

```bash
# Instale o gh-pages
npm install --save-dev gh-pages

# Adicione o script no package.json
{
  "scripts": {
    "deploy:playground": "npm run build && gh-pages -d playground"
  }
}

# Execute o deploy
npm run deploy:playground
```

### Opção 2: Usando Vite ou outro bundler

Se você quiser usar um bundler mais avançado, pode configurar o Vite:

```bash
npm install --save-dev vite
```

E criar um `vite.config.js`:

```javascript
export default {
  base: '/pdf-to-markdown-js/playground/',
  build: {
    outDir: 'playground/dist'
  }
}
```

## Testando Localmente

Para testar o playground localmente antes de fazer push:

```bash
# Build do projeto
npm run build

# Abra o playground no navegador
# Windows:
start playground/index.html

# macOS:
open playground/index.html

# Linux:
xdg-open playground/index.html
```

Ou use um servidor HTTP simples:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server .

# Depois acesse:
# http://localhost:8000/playground/
```

## Limitações Conhecidas

1. **CORS**: Alguns URLs de PDF podem falhar devido a políticas CORS
2. **Arquivos Grandes**: PDFs muito grandes podem causar problemas de memória no navegador
3. **PDFs Complexos**: PDFs com imagens, fontes embutidas ou estruturas complexas podem não converter perfeitamente

## Próximos Passos

- Adicionar mais exemplos de PDFs para testar
- Implementar suporte a PDFs protegidos por senha
- Adicionar opção para configurar os transformers
- Melhorar a detecção de tabelas e listas

## Suporte

Se você tiver problemas:

1. Abra uma issue no repositório
2. Inclua logs do console do navegador
3. Inclua logs do workflow do GitHub Actions
4. Forneça um exemplo do PDF que está causando problemas
