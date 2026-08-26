O `ifcx` é uma implementação experimental do formato IFCX para o desenvolvimento do IFC 5 alpha. Ele não é parte do runtime Python do OntoBDC ou InfoBIM.

## Objetivo

O projeto explora uma possível evolução do IFC baseada em:

- Arquivos JSON `.ifcx`.
- Objetos identificados por caminhos.
- Composição de modelos por camadas.
- Herança entre objetos.
- Schemas extensíveis para atributos.
- Integração de dados IFC com representações como OpenUSD, glTF, materiais e classificações externas.

A proposta substitui a estrutura monolítica STEP/SPF por componentes que podem ser distribuídos, importados, sobrepostos e compostos.

## Estrutura de um IFCX

O contrato principal está em [ifcx.tsp](/Users/eliasmpjunior/Brasidata/07_Engenharia_e_Tecnologia/06_Solucoes_Reutilizaveis/OntoBDC/ifcx/schema/ifcx.tsp).

Um arquivo contém quatro regiões:

| Região | Função |
|---|---|
| `header` | Identidade, versão, autor e timestamp do dataset |
| `imports` | Camadas externas das quais o arquivo depende |
| `schemas` | Contratos dos atributos utilizados |
| `data` | Nós, filhos, heranças e atributos do modelo |

Cada nó pode ter:

- `path`: identidade do nó.
- `children`: nomes locais apontando para outros nós.
- `inherits`: composição a partir de um tipo ou nó-base.
- `attributes`: dados associados por identificadores de schema.

O exemplo principal é [hello-wall.ifcx](/Users/eliasmpjunior/Brasidata/07_Engenharia_e_Tecnologia/06_Solucoes_Reutilizaveis/OntoBDC/ifcx/examples/Hello%20Wall/hello-wall.ifcx).

## Composição por camadas

O mecanismo central funciona em três etapas:

1. Federação dos arquivos e camadas.
2. Flattening dos nós que tratam do mesmo caminho.
3. Composição da árvore, expandindo `inherits` e `children`.

Em conflitos, os nós posteriores prevalecem sobre os anteriores. Isso permite, por exemplo, manter o modelo original e aplicar uma segunda camada que adiciona apenas `FireRating`.

Essa lógica está concentrada em:

- [compose.ts](/Users/eliasmpjunior/Brasidata/07_Engenharia_e_Tecnologia/06_Solucoes_Reutilizaveis/OntoBDC/ifcx/src/ifcx-core/composition/compose.ts)
- [workflows.ts](/Users/eliasmpjunior/Brasidata/07_Engenharia_e_Tecnologia/06_Solucoes_Reutilizaveis/OntoBDC/ifcx/src/ifcx-core/workflows.ts)
- [layer-stack.ts](/Users/eliasmpjunior/Brasidata/07_Engenharia_e_Tecnologia/06_Solucoes_Reutilizaveis/OntoBDC/ifcx/src/ifcx-core/layers/layer-stack.ts)

As camadas podem ser obtidas da memória, do sistema de arquivos ou remotamente por `fetch`.

## Componentes

O projeto está dividido em:

- `schema`: definição TypeSpec e geração de OpenAPI/TypeScript.
- `ifcx-core`: composição, federação, diff, validação e carregamento.
- `ifcx-cli`: interface de linha de comando experimental.
- `viewer`: visualização e inspeção com Three.js.
- `utils/python`: conversores e ferramentas auxiliares.
- `examples`: modelos IFCX de diversas disciplinas.
- `web`: artefatos publicados do viewer e documentação.

## CLI

A CLI em [ifcx-cli.ts](/Users/eliasmpjunior/Brasidata/07_Engenharia_e_Tecnologia/06_Solucoes_Reutilizaveis/OntoBDC/ifcx/src/ifcx-cli/ifcx-cli.ts) oferece:

- `compose`: compõe diversas camadas.
- `federate`: reúne arquivos IFCX.
- `diff`: calcula a diferença entre dois arquivos.
- `schema_to_openapi`: converte schemas para OpenAPI.
- `make_default_file`: cria um arquivo-base.
- `help`.

O comando `compose` também aceita:

```text
--no-fetch
--no-validate
```

## Viewer

O viewer utiliza Three.js e suporta:

- Geometria OpenUSD.
- Materiais básicos IFC.
- Parte dos materiais PBR do glTF.
- Point clouds.
- Seleção sincronizada entre árvore e geometria.
- Destaque visual do objeto selecionado.
- Composição dos arquivos antes da renderização.

O código principal está em [render.ts](/Users/eliasmpjunior/Brasidata/07_Engenharia_e_Tecnologia/06_Solucoes_Reutilizaveis/OntoBDC/ifcx/src/viewer/render.ts).

## Schemas e validação

O schema é escrito em TypeSpec e contempla tipos como:

- `Real`
- `Boolean`
- `Integer`
- `String`
- `DateTime`
- `Enum`
- `Array`
- `Object`
- `Reference`
- `Blob`

A validação atual verifica atributos contra os schemas declarados, incluindo objetos, arrays, enums e heranças de schema. O próprio código ainda possui um `TODO` para validar os schemas em si.

## Exemplos disponíveis

O repositório contém 47 arquivos `.ifcx` em 13 grupos, incluindo:

- Hello Wall
- Domestic Hot Water
- Georeferencing
- Geotech
- Railway
- Road
- Point Cloud
- Tunnel Excavation
- Tekla House
- IFC Hero Model
- ACCA Building
- Linear placement of signals
- PCERT Sample Scene

Há também oito arquivos IFC tradicionais para comparação ou origem dos exemplos.

## Estado atual

Este checkout está:

- Na branch `main`.
- Sincronizado com `origin/main`.
- No commit `02b0b21`.
- Sem alterações locais.
- Apontando para o fork `EliasMPJunior/IFC5-development`.

É explicitamente um projeto alpha:

- O schema ainda é incompleto.
- Existem funcionalidades não exploradas.
- A documentação ainda é parcial.
- Há limitações conhecidas e desconhecidas.
- As unidades ainda carecem de documentação completa.
- Os exemplos não são indicados para produção.
- As dependências Node não estão instaladas neste workspace, portanto os testes não foram executados nesta análise.
