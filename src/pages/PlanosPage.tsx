import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PackagesSection } from "@/components/home/PackagesSection";

export default function PlanosPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-8">
        <PackagesSection />
      </main>
      <Footer />
    </div>
  );
}
