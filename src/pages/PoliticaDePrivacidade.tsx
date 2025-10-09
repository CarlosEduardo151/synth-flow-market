import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function PoliticaPrivacidade() {
  const lastUpdated = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="min-h-screen bg-tech-lines">
      <Header />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-12 gradient-text">
            Política de Privacidade - StarAI
          </h1>

          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-10 space-y-10">

            {/* ARTIGO 1. INTRODUÇÃO E OBJETO */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">ARTIGO 1. INTRODUÇÃO E OBJETO</h2>
              <p className="text-muted-foreground leading-7">
                <strong>§ 1º.</strong> A presente Política de Privacidade da StarAI tem como objetivo estabelecer as diretrizes e regras para a coleta, o tratamento, o armazenamento e a proteção dos dados pessoais dos Usuários, em conformidade com a Lei Geral de Proteção de Dados (LGPD) e demais legislações pertinentes.
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 2º.</strong> Ao utilizar os serviços da StarAI, o Usuário concorda com as disposições desta Política de Privacidade, que é parte integrante dos Termos de Uso.
              </p>
            </section>

            {/* ARTIGO 2. DADOS COLETADOS */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">ARTIGO 2. DADOS COLETADOS</h2>
              <p className="text-muted-foreground leading-7">
                <strong>§ 3º.</strong> Para a prestação de nossos serviços, a StarAI poderá coletar os seguintes dados pessoais dos Usuários, com a finalidade de aprimorar a experiência e a segurança:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-muted-foreground leading-7">
                <li>Dados de identificação e contato, como nome e endereço de e-mail;</li>
                <li>Dados de uso, como interações com os serviços de inteligência artificial e preferências de personalização;</li>
                <li>Dados técnicos, como endereço IP e informações sobre o dispositivo do Usuário.</li>
              </ul>
            </section>

            {/* ARTIGO 3. FINALIDADE DO TRATAMENTO */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">ARTIGO 3. FINALIDADE DO TRATAMENTO</h2>
              <p className="text-muted-foreground leading-7">
                <strong>§ 4º.</strong> Os dados pessoais coletados serão tratados para as seguintes finalidades:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-muted-foreground leading-7">
                <li>Prestação e melhoria dos serviços de IA, garantindo sua correta operação e desempenho;</li>
                <li>Personalização do conteúdo e das funcionalidades, adaptando-os às necessidades do Usuário;</li>
                <li>Comunicação e suporte técnico;</li>
                <li>Análise de tendências e otimização dos sistemas;</li>
                <li>Cumprimento de obrigações legais, regulatórias ou judiciais.</li>
              </ul>
              <p className="text-muted-foreground leading-7 mt-4">
                <strong>§ 5º.</strong> Qualquer uso dos dados que não se enquadre nas finalidades mencionadas será submetido à prévia e expressa autorização do Usuário.
              </p>
            </section>

            {/* ARTIGO 4. COMPARTILHAMENTO DE DADOS */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">ARTIGO 4. COMPARTILHAMENTO DE DADOS</h2>
              <p className="text-muted-foreground leading-7">
                <strong>§ 6º.</strong> A StarAI não compartilha, vende ou aluga os dados pessoais dos Usuários para terceiros, exceto nas seguintes hipóteses:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-muted-foreground leading-7">
                <li>Mediante consentimento explícito do Usuário;</li>
                <li>Em caso de fusão, aquisição ou venda de ativos da empresa;</li>
                <li>Para cumprimento de exigências legais, como ordens judiciais ou regulamentações governamentais.</li>
              </ul>
              <p className="text-muted-foreground leading-7 mt-4">
                <strong>§ 7º.</strong> Em casos de compartilhamento com terceiros prestadores de serviços, a StarAI garante que estes estarão sujeitos a rigorosos contratos que exigem a proteção e confidencialidade dos dados.
              </p>
            </section>

            {/* ARTIGO 5. SEGURANÇA E PROTEÇÃO DOS DADOS */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">ARTIGO 5. SEGURANÇA E PROTEÇÃO DOS DADOS</h2>
              <p className="text-muted-foreground leading-7">
                <strong>§ 8º.</strong> A StarAI implementa e mantém medidas de segurança técnicas e administrativas, a fim de proteger os dados pessoais de acessos não autorizados e de situações acidentais ou ilícitas de destruição, perda, alteração, comunicação ou qualquer forma de tratamento inadequado ou ilícito.
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 9º.</strong> A segurança da informação é prioridade na StarAI. Para isso, utilizamos <strong>Certificados SSL/TLS (Secure Sockets Layer / Transport Layer Security)</strong>, que garantem a criptografia dos dados em trânsito.
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 10.</strong> Os **Certificados SSL** asseguram que a comunicação entre o navegador do Usuário e nossos servidores seja privada e segura, protegendo informações sensíveis contra interceptações, fraudes e ataques.
              </p>
            </section>

            {/* ARTIGO 6. DIREITOS DOS TITULARES */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">ARTIGO 6. DIREITOS DOS TITULARES</h2>
              <p className="text-muted-foreground leading-7">
                <strong>§ 11.</strong> O Usuário, como titular dos dados, pode exercer seus direitos previstos na LGPD a qualquer momento, incluindo:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-muted-foreground leading-7">
                <li>Acesso e confirmação da existência de tratamento de dados;</li>
                <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a lei;</li>
                <li>Portabilidade a outro fornecedor de serviço;</li>
                <li>Revogação do consentimento, quando aplicável.</li>
              </ul>
              <p className="text-muted-foreground leading-7 mt-4">
                <strong>§ 12.</strong> Para exercer estes direitos, o Usuário deverá entrar em contato conosco através dos canais oficiais.
              </p>
            </section>

            {/* ARTIGO 7. RETENÇÃO E ELIMINAÇÃO DE DADOS */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">ARTIGO 7. RETENÇÃO E ELIMINAÇÃO DE DADOS</h2>
              <p className="text-muted-foreground leading-7">
                <strong>§ 13.</strong> Os dados pessoais do Usuário serão retidos apenas pelo período necessário para cumprir as finalidades descritas nesta Política, bem como para o cumprimento de obrigações legais e regulatórias.
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 14.</strong> Após o término do tratamento, os dados serão eliminados, exceto quando a sua manutenção for autorizada por lei.
              </p>
            </section>

            {/* ARTIGO 8. ALTERAÇÕES NA POLÍTICA */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">ARTIGO 8. ALTERAÇÕES NA POLÍTICA</h2>
              <p className="text-muted-foreground leading-7">
                <strong>§ 15.</strong> A StarAI se reserva o direito de alterar esta Política de Privacidade a qualquer momento, sem necessidade de aviso prévio. As alterações serão publicadas nesta página e o uso continuado dos Serviços após a publicação constitui aceitação tácita e integral da nova versão.
              </p>
            </section>
            
            {/* ARTIGO 9. LEGISLAÇÃO E FORO */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">ARTIGO 9. LEGISLAÇÃO E FORO</h2>
              <p className="text-muted-foreground leading-7">
                <strong>§ 16.</strong> Esta Política de Privacidade é regida e interpretada de acordo com as leis da República Federativa do Brasil, em particular a LGPD e o Código Civil Brasileiro.
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 17.</strong> Para a solução de controvérsias, fica eleito o foro da comarca de São Paulo, Estado de São Paulo, com renúncia expressa a qualquer outro.
              </p>
            </section>

            {/* ARTIGO 10. CONTATO */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">ARTIGO 10. CONTATO</h2>
              <p className="text-muted-foreground leading-7">
                <strong>§ 18.</strong> Para quaisquer dúvidas, solicitações ou informações adicionais sobre esta Política, o Usuário deve entrar em contato exclusivamente pelos canais de comunicação oficiais da StarAI.
              </p>
            </section>

            {/* Rodapé */}
            <div className="text-center pt-8 border-t border-border space-y-2">
              <p className="text-muted-foreground">
                <strong>Última atualização:</strong> {lastUpdated}
              </p>
              <p className="text-muted-foreground">
                © 2025 StarAI - Todos os direitos reservados.
              </p>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}