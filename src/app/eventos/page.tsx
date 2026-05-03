import PublicEventsSection from '@/components/PublicEventsSection'
import PublicHeader from '@/components/PublicHeader'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'

export const metadata = {
  title: 'Eventos Gratuitos | EdAcademy',
  description: 'Participe das nossas aulas abertas e masterclasses gratuitas.',
}

export default function EventosPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
      <ScrollReveal />
      <PublicHeader />
      
      <main style={{ flex: 1, paddingTop: '6rem' }}>
        <PublicEventsSection />
      </main>

      <Footer />
    </div>
  )
}
