import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function TermosUso() {
  const lastUpdated = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="min-h-screen bg-tech-lines">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-12 gradient-text">
            Termos de Uso - StarAI
          </h1>
          
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-10 space-y-10">

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">ARTIGO 1. DEFINIÇÕES E ÂMBITO DE APLICAÇÃO</h2>
              <p className="text-muted-foreground leading-7">
                <strong>§ 1º.</strong> Para os fins e efeitos do presente instrumento, os seguintes termos são definidos com os significados atribuídos abaixo:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-muted-foreground leading-7">
                <li><strong>StarAI:</strong> Refere-se operação e manutenção de todos os serviços e plataformas descritos neste documento.</li>
                <li><strong>Usuário:</strong> Qualquer pessoa física ou jurídica que acesse, navegue, utilize ou se beneficie dos serviços disponibilizados pela StarAI.</li>
                <li><strong>Serviços:</strong> Todo e qualquer produto, ferramenta, software, plataforma ou funcionalidade oferecida pela StarAI, incluindo, mas não se limitando a, agentes de inteligência artificial, soluções de automação, ferramentas de análise de dados, e serviços de consultoria especializada.</li>
                <li><strong>Conteúdo:</strong> Abrange toda e qualquer informação, dado, software, material, texto, imagem ou qualquer outro elemento disponibilizado ou gerado pelo Usuário ou pela StarAI no contexto do uso dos Serviços.</li>
              </ul>
              <p className="text-muted-foreground leading-7 mt-4">
                <strong>§ 2º.</strong> O presente Termos de Uso rege o relacionamento entre a StarAI e o Usuário, estabelecendo as condições para o acesso e a utilização dos Serviços.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">ARTIGO 2. ACEITAÇÃO DOS TERMOS</h2>
              <p className="text-muted-foreground leading-7">
                <strong>§ 3º.</strong> Ao acessar, navegar ou utilizar qualquer Serviço da StarAI, o Usuário manifesta, de forma inequívoca e irrevogável, sua plena e integral concordância com todas as cláusulas e condições estabelecidas nestes Termos de Uso.
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 4º.</strong> A não concordância com qualquer disposição contida neste documento implica na obrigação imediata do Usuário de cessar a utilização de todos os Serviços da StarAI.
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 5º.</strong> A StarAI reserva-se o direito de, a qualquer tempo, alterar ou atualizar estes Termos de Uso, sem prévio aviso, e a utilização contínua dos Serviços após a publicação de tais alterações constitui aceitação tácita e expressa do Usuário às novas condições.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">ARTIGO 3. REGISTRO E CONTA DO USUÁRIO</h2>
              <p className="text-muted-foreground leading-7">
                <strong>§ 6º.</strong> A utilização de determinados Serviços pode exigir a criação de uma conta pessoal e o fornecimento de informações precisas, completas e atualizadas no momento do registro.
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 7º.</strong> O Usuário é o único e exclusivo responsável pela manutenção da confidencialidade de suas credenciais de acesso, bem como por todas as atividades que ocorram sob sua conta.
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 8º.</strong> O Usuário se compromete a notificar a StarAI imediatamente sobre qualquer uso não autorizado de sua conta ou qualquer outra violação de segurança de que tenha conhecimento.
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 9º.</strong> A StarAI poderá, a seu exclusivo critério, suspender, limitar ou encerrar a conta do Usuário em caso de suspeita de uso indevido, violação destes Termos, ou qualquer comportamento que a StarAI considere danoso.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">ARTIGO 4. PROPRIEDADE INTELECTUAL</h2>
              <p className="text-muted-foreground leading-7">
                <strong>§ 10.</strong> Toda tecnologia, software, algoritmo, documentação, design, marca, nome comercial, e qualquer outro conteúdo disponibilizado ou criado pela StarAI é de sua propriedade exclusiva e inalienável.
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 11.</strong> Estes Termos de Uso não concedem ao Usuário qualquer direito, licença ou titularidade sobre a propriedade intelectual da StarAI, exceto pela licença limitada de uso dos Serviços, conforme expresso neste documento.
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 12.</strong> O Usuário está proibido de reproduzir, adaptar, modificar, distribuir, vender, licenciar ou de qualquer forma explorar comercialmente o Conteúdo ou a propriedade intelectual da StarAI sem autorização prévia e expressa.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">ARTIGO 5. OBRIGAÇÕES E RESPONSABILIDADES DO USUÁRIO</h2>
              <p className="text-muted-foreground leading-7">
                <strong>§ 13.</strong> O Usuário compromete-se a utilizar os Serviços exclusivamente para fins lícitos, éticos e em conformidade com a legislação brasileira.
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 14.</strong> É vedado ao Usuário infringir quaisquer direitos de propriedade intelectual ou industrial da StarAI ou de terceiros no uso dos Serviços.
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 15.</strong> O Usuário não poderá praticar atos que possam comprometer a integridade, performance, segurança ou a disponibilidade dos Serviços.
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 16.</strong> O Usuário é o único responsável pela veracidade, exatidão e legalidade do Conteúdo que insere ou processa através dos Serviços.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">ARTIGO 6. PROTEÇÃO DE DADOS E PRIVACIDADE</h2>
              <p className="text-muted-foreground leading-7">
                <strong>§ 17.</strong> A StarAI observa rigorosamente a legislação vigente em matéria de proteção de dados, em especial a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018).
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 18.</strong> Todos os dados fornecidos pelo Usuário são coletados, armazenados e tratados para fins específicos de prestação e aprimoramento dos Serviços, garantindo confidencialidade, integridade e segurança. Para mais detalhes, consulte nossa Política de Privacidade.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">ARTIGO 7. LIMITAÇÃO DE RESPONSABILIDADE</h2>
              <p className="text-muted-foreground leading-7">
                <strong>§ 19.</strong> A StarAI não se responsabiliza por danos indiretos, incidentais, consequenciais ou lucros cessantes decorrentes do uso ou da impossibilidade de uso dos Serviços.
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 20.</strong> A responsabilidade total e direta da StarAI, por quaisquer reclamações ou danos, limita-se ao valor efetivamente pago pelo Usuário nos doze (12) meses anteriores ao evento que originou a reclamação.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">ARTIGO 8. DISPOSIÇÕES GERAIS</h2>
              <p className="text-muted-foreground leading-7">
                <strong>§ 21.</strong> A StarAI reserva-se o direito de suspender ou encerrar o acesso de qualquer Usuário em caso de violação destes Termos, comportamento ilícito ou razões operacionais justificadas.
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 22.</strong> Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil.
              </p>
              <p className="text-muted-foreground leading-7">
                <strong>§ 23.</strong> Para a resolução de quaisquer litígios, fica eleito o foro da comarca de São Paulo, Estado de São Paulo, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
              </p>
            </section>

            <div className="text-center pt-10 border-t border-border space-y-2">
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