import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Provisioning RH workflow for user: ${userId}`);

    const N8N_API_KEY = Deno.env.get('N8N_API_KEY');
    const N8N_BASE_URL = Deno.env.get('N8N_BASE_URL');

    if (!N8N_API_KEY || !N8N_BASE_URL) {
      console.log('N8N credentials not configured, creating mock workflow');
      
      return new Response(
        JSON.stringify({
          success: true,
          workflowId: `mock-rh-${userId.substring(0, 8)}`,
          message: 'Workspace criado com sucesso (modo simulado)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userIdShort = userId.substring(0, 8);
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://ewenwixtpzpydodtavqd.supabase.co';

    // Complete RH Workflow template - without id/webhookId fields (n8n generates them)
    const workflowTemplate = {
      name: `Agente RH - ${userIdShort}`,
      nodes: [
        {
          parameters: {
            httpMethod: "POST",
            path: `agente-rh-${userIdShort}`,
            options: {}
          },
          type: "n8n-nodes-base.webhook",
          typeVersion: 2.1,
          position: [-144, 0],
          name: "Webhook"
        },
        {
          parameters: {},
          type: "n8n-nodes-base.noOp",
          typeVersion: 1,
          position: [-80, 208],
          name: "No Operation, do nothing"
        },
        {
          parameters: {
            promptType: "define",
            text: "={{ $json.pdftext }}{{ $json.body.text.message }}",
            options: {
              systemMessage: "Você é um assistente de RH, você irá receber os cúrriculos dos pretendentes e avaliar e enviar para o grupo do RH irá análisar os pontos altos e pontos baixos levando em consideração se já tem expêriencia ou não.\n\nMas e se for uma pergunta não uma entrega de cúrriculo, você irá criar depois da mensagem formato: \"'eduvida'\", isso se for uma dúvida ou qualquer coisa que não seja o cúrriculo, esse 'eduvida' vai servir para o código analisar e enviar a mensagem corretamente, para saber se essa mensagem vai ser enviada para a equipe de RH ou vai ser enviada para o pretendente."
            }
          },
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 3,
          position: [1104, 0],
          name: "AI Agent"
        },
        {
          parameters: {
            model: {
              __rl: true,
              mode: "list",
              value: "gpt-4.1-mini"
            },
            builtInTools: {},
            options: {}
          },
          type: "@n8n/n8n-nodes-langchain.lmChatOpenAi",
          typeVersion: 1.3,
          position: [1056, 176],
          name: "OpenAI Chat Model",
          credentials: {
            openAiApi: {
              id: "82KiQN3OREJacSkC",
              name: "OpenAi account"
            }
          }
        },
        {
          parameters: {
            url: "={{ $('Webhook').item.json.body.image.imageUrl }}",
            options: {}
          },
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [544, -144],
          name: "HTTP Request3"
        },
        {
          parameters: {
            resource: "image",
            operation: "analyze",
            modelId: {
              __rl: true,
              value: "gpt-4o-mini",
              mode: "list",
              cachedResultName: "GPT-4O-MINI"
            },
            text: "={{ $('Webhook').item.json.body.image.caption }} fale sempre em português Brasil.",
            inputType: "base64",
            options: {}
          },
          type: "@n8n/n8n-nodes-langchain.openAi",
          typeVersion: 1.8,
          position: [864, -144],
          name: "Analyze image",
          credentials: {
            openAiApi: {
              id: "82KiQN3OREJacSkC",
              name: "OpenAi account"
            }
          }
        },
        {
          parameters: {
            conditions: {
              options: {
                caseSensitive: true,
                leftValue: "",
                typeValidation: "strict",
                version: 2
              },
              conditions: [
                {
                  leftValue: "={{ $json.body.image.caption }}",
                  rightValue: "",
                  operator: {
                    type: "string",
                    operation: "exists",
                    singleValue: true
                  }
                }
              ],
              combinator: "and"
            },
            options: {}
          },
          type: "n8n-nodes-base.if",
          typeVersion: 2.2,
          position: [672, -144],
          name: "Image Caption"
        },
        {
          parameters: {
            url: "={{ $('Webhook').item.json.body.audio.audioUrl }}",
            options: {}
          },
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [672, 64],
          name: "HTTP Request"
        },
        {
          parameters: {
            resource: "audio",
            operation: "transcribe",
            options: {}
          },
          type: "@n8n/n8n-nodes-langchain.openAi",
          typeVersion: 1.8,
          position: [800, 64],
          name: "Transcribe a recording",
          credentials: {
            openAiApi: {
              id: "82KiQN3OREJacSkC",
              name: "OpenAi account"
            }
          }
        },
        {
          parameters: {
            sessionIdType: "customKey",
            sessionKey: "={{ $('Webhook').item.json.body.phone }}",
            tableName: `agentesderh_${userIdShort}`,
            contextWindowLength: 500
          },
          type: "@n8n/n8n-nodes-langchain.memoryPostgresChat",
          typeVersion: 1.3,
          position: [1184, 176],
          name: "Postgres Chat Memory",
          credentials: {
            postgres: {
              id: "rs8jsBSB4RkypUTO",
              name: "Postgres account"
            }
          }
        },
        {
          parameters: {
            rules: {
              values: [
                {
                  conditions: {
                    options: {
                      caseSensitive: true,
                      leftValue: "",
                      typeValidation: "strict",
                      version: 2
                    },
                    conditions: [
                      {
                        leftValue: "={{ $json.isDuvida }}",
                        rightValue: "",
                        operator: {
                          type: "boolean",
                          operation: "false",
                          singleValue: true
                        }
                      }
                    ],
                    combinator: "and"
                  },
                  renameOutput: true,
                  outputKey: "Imagem"
                },
                {
                  conditions: {
                    options: {
                      caseSensitive: true,
                      leftValue: "",
                      typeValidation: "strict",
                      version: 2
                    },
                    conditions: [
                      {
                        leftValue: "={{ $('Webhook').item.json.body.text }}",
                        rightValue: "",
                        operator: {
                          type: "object",
                          operation: "exists",
                          singleValue: true
                        }
                      }
                    ],
                    combinator: "and"
                  },
                  renameOutput: true,
                  outputKey: "Mensagem"
                },
                {
                  conditions: {
                    options: {
                      caseSensitive: true,
                      leftValue: "",
                      typeValidation: "strict",
                      version: 2
                    },
                    conditions: [
                      {
                        leftValue: "={{ $json.body.audio.audioUrl }}",
                        rightValue: "",
                        operator: {
                          type: "object",
                          operation: "exists",
                          singleValue: true
                        }
                      }
                    ],
                    combinator: "and"
                  },
                  renameOutput: true,
                  outputKey: "Aúdio"
                },
                {
                  conditions: {
                    options: {
                      caseSensitive: true,
                      leftValue: "",
                      typeValidation: "strict",
                      version: 2
                    },
                    conditions: [
                      {
                        leftValue: "={{ $json.isDuvida }}",
                        rightValue: "",
                        operator: {
                          type: "boolean",
                          operation: "true",
                          singleValue: true
                        }
                      }
                    ],
                    combinator: "and"
                  },
                  renameOutput: true,
                  outputKey: "Dúvida"
                }
              ]
            },
            options: {}
          },
          type: "n8n-nodes-base.switch",
          typeVersion: 3.3,
          position: [1584, -32],
          name: "Separador 2"
        },
        {
          parameters: {
            resource: "audio",
            input: "={{ $('AI Agent').item.json.output }}",
            voice: "shimmer",
            options: {
              response_format: "mp3"
            }
          },
          type: "@n8n/n8n-nodes-langchain.openAi",
          typeVersion: 1.8,
          position: [1856, 16],
          name: "Generate audio",
          credentials: {
            openAiApi: {
              id: "82KiQN3OREJacSkC",
              name: "OpenAi account"
            }
          }
        },
        {
          parameters: {
            operation: "binaryToPropery",
            options: {}
          },
          type: "n8n-nodes-base.extractFromFile",
          typeVersion: 1,
          position: [1984, 16],
          name: "Extract from File"
        },
        {
          parameters: {
            method: "POST",
            url: "https://api.z-api.io/instances/3EC715DDD9F4B141EF1C061BA788E473/token/3F6FBEB98D63F093FE4BF3C1/send-text",
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: "client-token",
                  value: "F5c5d142be681407aa039e28c0f0a37d0S"
                }
              ]
            },
            sendBody: true,
            bodyParameters: {
              parameters: [
                {
                  name: "phone",
                  value: "={{ $('Webhook').item.json.body.phone }}"
                },
                {
                  name: "audio",
                  value: "=data:data/mpeg;base64,{{ $json.data }}"
                },
                {
                  name: "message",
                  value: "\"\""
                },
                {
                  name: "messageId",
                  value: "={{ $('Webhook').item.json.body.messageId }}"
                }
              ]
            },
            options: {}
          },
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [2112, 16],
          name: "Enviar Aúdio"
        },
        {
          parameters: {
            conditions: {
              options: {
                caseSensitive: true,
                leftValue: "",
                typeValidation: "strict",
                version: 2
              },
              conditions: [
                {
                  leftValue: "={{ $json.body.fromMe }}",
                  rightValue: "",
                  operator: {
                    type: "boolean",
                    operation: "false",
                    singleValue: true
                  }
                }
              ],
              combinator: "and"
            },
            options: {}
          },
          type: "n8n-nodes-base.if",
          typeVersion: 2.2,
          position: [-32, 0],
          name: "FromME"
        },
        {
          parameters: {
            jsCode: `// O n8n recebe os dados em um array chamado 'items'
return items.map(item => {
  const textoOriginal = item.json.output || "";
  
  // Verifica se é uma dúvida
  const eDuvida = textoOriginal.toLowerCase().includes('eduvida');
  
  // Remove a tag para limpar o texto
  const textoLimpo = textoOriginal.replace(/'?eduvida'?/gi, '').trim();
  
  // Extrai informações do currículo usando regex
  let nome = "";
  let idade = "";
  let avaliacao = "";
  let infoadd = "";
  let msg = textoLimpo;
  
  // Tenta extrair nome (primeira linha ou após "Nome:")
  const nomeMatch = textoLimpo.match(/(?:Nome[:\\s]*)?([A-ZÀ-Ú][a-zà-ú]+(?:\\s+[A-ZÀ-Ú][a-zà-ú]+)+)/);
  if (nomeMatch) nome = nomeMatch[1] || nomeMatch[0];
  
  // Tenta extrair idade
  const idadeMatch = textoLimpo.match(/(?:idade|anos)[:\\s]*(\\d{1,2})|(?:(\\d{1,2})\\s*anos)/i);
  if (idadeMatch) idade = idadeMatch[1] || idadeMatch[2];
  
  // Tenta extrair avaliação (nota de 0 a 10)
  const avaliacaoMatch = textoLimpo.match(/(?:nota|avaliação|pontuação)[:\\s]*(\\d+(?:[,.]\\d)?)/i);
  if (avaliacaoMatch) avaliacao = avaliacaoMatch[1];
  
  // Extrai experiências
  const expMatch = textoLimpo.match(/(?:experiência|trabalhou|empresa)[:\\s]*([^.\\n]+)/gi);
  if (expMatch) infoadd = expMatch.join("; ");

  return {
    json: {
      mensagem: textoLimpo,
      isDuvida: eDuvida,
      nome: nome,
      idade: idade,
      avaliacao: avaliacao,
      infoadd: infoadd,
      msg: msg,
      textoOriginal: textoOriginal
    }
  };
});`
          },
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [1456, 0],
          name: "Code in JavaScript"
        },
        // Novo nó HTTP Request para enviar candidato ao painel
        {
          parameters: {
            method: "POST",
            url: supabaseUrl + "/functions/v1/rh-candidato-webhook",
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: "Content-Type",
                  value: "application/json"
                },
                {
                  name: "x-user-id",
                  value: userId
                }
              ]
            },
            sendBody: true,
            specifyBody: "json",
            jsonBody: "={ \"nome\": \"{{ $json.nome }}\", \"idade\": \"{{ $json.idade }}\", \"avaliacao\": \"{{ $json.avaliacao }}\", \"msg\": \"{{ $json.msg }}\", \"infoadd\": \"{{ $json.infoadd }}\", \"telefone\": \"{{ $('Webhook').item.json.body.phone }}\" }"
          },
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [1700, -144],
          name: "Enviar Candidato Painel"
        },
        {
          parameters: {
            method: "POST",
            url: "https://api.z-api.io/instances/3EC715DDD9F4B141EF1C061BA788E473/token/3F6FBEB98D63F093FE4BF3C1/send-text",
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: "client-token",
                  value: "F5c5d142be681407aa039e28c0f0a37d0S"
                }
              ]
            },
            sendBody: true,
            bodyParameters: {
              parameters: [
                {
                  name: "phone",
                  value: "={{ $('Webhook').item.json.body.phone }}"
                },
                {
                  name: "message",
                  value: "={{ $('AI Agent').item.json.output }}"
                },
                {
                  name: "messageId",
                  value: "={{ $('Webhook').item.json.body.messageId }}"
                }
              ]
            },
            options: {}
          },
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [1824, 192],
          name: "Enviar resposta pretendente"
        },
        {
          parameters: {
            method: "POST",
            url: "https://api.z-api.io/instances/3EC715DDD9F4B141EF1C061BA788E473/token/3F6FBEB98D63F093FE4BF3C1/send-text",
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: "client-token",
                  value: "F5c5d142be681407aa039e28c0f0a37d0S"
                }
              ]
            },
            sendBody: true,
            bodyParameters: {
              parameters: [
                {
                  name: "phone",
                  value: "={{ $('Webhook').item.json.body.phone }}"
                },
                {
                  name: "message",
                  value: "={{ $('AI Agent').item.json.output }}"
                },
                {
                  name: "messageId",
                  value: "={{ $('Webhook').item.json.body.messageId }}"
                }
              ]
            },
            options: {}
          },
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [2016, -144],
          name: "Enviar resposta RH"
        },
        {
          parameters: {
            rules: {
              values: [
                {
                  conditions: {
                    options: {
                      caseSensitive: true,
                      leftValue: "",
                      typeValidation: "strict",
                      version: 2
                    },
                    conditions: [
                      {
                        leftValue: "={{ $json.body.image }}",
                        rightValue: "",
                        operator: {
                          type: "object",
                          operation: "exists",
                          singleValue: true
                        }
                      }
                    ],
                    combinator: "and"
                  },
                  renameOutput: true,
                  outputKey: "Imagem"
                },
                {
                  conditions: {
                    options: {
                      caseSensitive: true,
                      leftValue: "",
                      typeValidation: "strict",
                      version: 2
                    },
                    conditions: [
                      {
                        leftValue: "={{ $('Webhook').item.json.body.text }}",
                        rightValue: "",
                        operator: {
                          type: "object",
                          operation: "exists",
                          singleValue: true
                        }
                      }
                    ],
                    combinator: "and"
                  },
                  renameOutput: true,
                  outputKey: "Mensagem"
                },
                {
                  conditions: {
                    options: {
                      caseSensitive: true,
                      leftValue: "",
                      typeValidation: "strict",
                      version: 2
                    },
                    conditions: [
                      {
                        leftValue: "={{ $json.body.audio.audioUrl }}",
                        rightValue: "",
                        operator: {
                          type: "object",
                          operation: "exists",
                          singleValue: true
                        }
                      }
                    ],
                    combinator: "and"
                  },
                  renameOutput: true,
                  outputKey: "Aúdio"
                },
                {
                  conditions: {
                    options: {
                      caseSensitive: true,
                      leftValue: "",
                      typeValidation: "strict",
                      version: 2
                    },
                    conditions: [
                      {
                        leftValue: "={{ $json.body.document }}",
                        rightValue: "",
                        operator: {
                          type: "object",
                          operation: "exists",
                          singleValue: true
                        }
                      }
                    ],
                    combinator: "and"
                  },
                  renameOutput: true,
                  outputKey: "Documento"
                }
              ]
            },
            options: {}
          },
          type: "n8n-nodes-base.switch",
          typeVersion: 3.3,
          position: [336, -32],
          name: "Separador"
        },
        {
          parameters: {
            url: "={{ $json.body.document.documentUrl }}",
            options: {}
          },
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.3,
          position: [608, 208],
          name: "HTTP Request1"
        },
        {
          parameters: {
            operation: "pdf",
            options: {}
          },
          type: "n8n-nodes-base.extractFromFile",
          typeVersion: 1,
          position: [720, 208],
          name: "Extract from File1"
        },
        {
          parameters: {
            jsCode: "// Garantimos que o n8n trate cada item individualmente\nreturn items.map(item => {\n  // Tentamos pegar o texto de várias fontes comuns (ajuste se necessário)\n  const conteudo = item.json.text || item.json.mensagem || item.json.output || \"\";\n\n  return {\n    json: {\n      pdftext: conteudo // Aqui criamos sua variável única\n    }\n  };\n});"
          },
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [832, 208],
          name: "Code in JavaScript1"
        }
      ],
      connections: {
        "Webhook": {
          main: [
            [
              {
                node: "FromME",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "AI Agent": {
          main: [
            [
              {
                node: "Code in JavaScript",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "OpenAI Chat Model": {
          ai_languageModel: [
            [
              {
                node: "AI Agent",
                type: "ai_languageModel",
                index: 0
              }
            ]
          ]
        },
        "HTTP Request3": {
          main: [
            [
              {
                node: "Image Caption",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "Analyze image": {
          main: [
            [
              {
                node: "AI Agent",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "Image Caption": {
          main: [
            [
              {
                node: "Analyze image",
                type: "main",
                index: 0
              }
            ],
            [
              {
                node: "Analyze image",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "HTTP Request": {
          main: [
            [
              {
                node: "Transcribe a recording",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "Transcribe a recording": {
          main: [
            [
              {
                node: "AI Agent",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "Postgres Chat Memory": {
          ai_memory: [
            [
              {
                node: "AI Agent",
                type: "ai_memory",
                index: 0
              }
            ]
          ]
        },
        "Separador 2": {
          main: [
            [
              {
                node: "Enviar Candidato Painel",
                type: "main",
                index: 0
              }
            ],
            [
              {
                node: "Enviar resposta RH",
                type: "main",
                index: 0
              }
            ],
            [
              {
                node: "Generate audio",
                type: "main",
                index: 0
              }
            ],
            [
              {
                node: "Enviar resposta pretendente",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "Generate audio": {
          main: [
            [
              {
                node: "Extract from File",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "Extract from File": {
          main: [
            [
              {
                node: "Enviar Aúdio",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "FromME": {
          main: [
            [
              {
                node: "Separador",
                type: "main",
                index: 0
              }
            ],
            [
              {
                node: "No Operation, do nothing",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "Code in JavaScript": {
          main: [
            [
              {
                node: "Separador 2",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "Enviar Candidato Painel": {
          main: [
            [
              {
                node: "Enviar resposta RH",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "Separador": {
          main: [
            [
              {
                node: "HTTP Request3",
                type: "main",
                index: 0
              }
            ],
            [
              {
                node: "AI Agent",
                type: "main",
                index: 0
              }
            ],
            [
              {
                node: "HTTP Request",
                type: "main",
                index: 0
              }
            ],
            [
              {
                node: "HTTP Request1",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "HTTP Request1": {
          main: [
            [
              {
                node: "Extract from File1",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "Extract from File1": {
          main: [
            [
              {
                node: "Code in JavaScript1",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "Code in JavaScript1": {
          main: [
            [
              {
                node: "AI Agent",
                type: "main",
                index: 0
              }
            ]
          ]
        }
      },
      settings: {
        executionOrder: "v1"
      }
    };

    // Create workflow in n8n
    const createResponse = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflowTemplate),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Failed to create workflow:', errorText);
      throw new Error(`Failed to create workflow: ${createResponse.status}`);
    }

    const createdWorkflow = await createResponse.json();
    console.log(`Workflow created with ID: ${createdWorkflow.id}`);

    // Activate the workflow
    const activateResponse = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${createdWorkflow.id}/activate`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
      },
    });

    if (!activateResponse.ok) {
      console.warn('Failed to activate workflow, but workflow was created');
    }

    return new Response(
      JSON.stringify({
        success: true,
        workflowId: createdWorkflow.id,
        webhookPath: `agente-rh-${userIdShort}`,
        message: 'Workspace criado e ativado com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error provisioning workflow:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
