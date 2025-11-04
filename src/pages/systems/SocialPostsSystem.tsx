import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Share2, Image as ImageIcon, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SocialPost {
  id: string;
  content: string;
  image_url: string | null;
  platforms: string[];
  scheduled_for: string;
  status: string;
  published_at: string | null;
  created_at: string;
}

const SocialPostsSystem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customerProductId, setCustomerProductId] = useState<string | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPost, setIsCreatingPost] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAccess();
  }, [user]);

  const checkAccess = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('customer_products')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_slug', 'posts-sociais')
        .eq('is_active', true)
        .single();

      if (error || !data) {
        toast({
          title: "Acesso Negado",
          description: "Você precisa comprar o sistema de Posts Sociais para acessar.",
          variant: "destructive"
        });
        navigate('/meus-produtos');
        return;
      }

      setCustomerProductId(data.id);
      await loadPosts(data.id);
    } catch (error) {
      console.error('Error checking access:', error);
      navigate('/meus-produtos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPosts = async (productId: string) => {
    const { data, error } = await supabase
      .from('social_posts')
      .select('*')
      .eq('customer_product_id', productId)
      .order('scheduled_for', { ascending: true });

    if (!error && data) {
      setPosts(data);
    }
  };

  const handleCreatePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customerProductId) return;

    const formData = new FormData(e.currentTarget);
    const platforms = formData.getAll('platforms') as string[];

    if (platforms.length === 0) {
      toast({ title: "Selecione pelo menos uma plataforma", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from('social_posts').insert({
      customer_product_id: customerProductId,
      content: formData.get('content') as string,
      image_url: formData.get('image_url') as string || null,
      platforms: platforms,
      scheduled_for: new Date(formData.get('scheduled_for') as string).toISOString()
    });

    if (!error) {
      toast({ title: "Post agendado com sucesso!" });
      setIsCreatingPost(false);
      loadPosts(customerProductId);
    } else {
      toast({ title: "Erro ao agendar post", variant: "destructive" });
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'instagram': return 'bg-pink-500';
      case 'facebook': return 'bg-blue-600';
      case 'linkedin': return 'bg-blue-700';
      case 'twitter': return 'bg-sky-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Share2 className="h-8 w-8 text-primary" />
              Posts Sociais Automatizados
            </h1>
            <p className="text-muted-foreground mt-2">Gerencie e agende posts para redes sociais</p>
          </div>
          <Dialog open={isCreatingPost} onOpenChange={setIsCreatingPost}>
            <DialogTrigger asChild>
              <Button>
                <Share2 className="h-4 w-4 mr-2" />
                Novo Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleCreatePost}>
                <DialogHeader>
                  <DialogTitle>Criar Novo Post</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="content">Conteúdo do Post *</Label>
                    <Textarea 
                      id="content" 
                      name="content" 
                      placeholder="Escreva o conteúdo do seu post..."
                      className="min-h-[150px]"
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="image_url">URL da Imagem</Label>
                    <Input 
                      id="image_url" 
                      name="image_url" 
                      type="url"
                      placeholder="https://exemplo.com/imagem.jpg"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Plataformas *</Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="platforms" value="instagram" />
                        <span>Instagram</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="platforms" value="facebook" />
                        <span>Facebook</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="platforms" value="linkedin" />
                        <span>LinkedIn</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="platforms" value="twitter" />
                        <span>Twitter/X</span>
                      </label>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="scheduled_for">Agendar Para *</Label>
                    <Input 
                      id="scheduled_for" 
                      name="scheduled_for" 
                      type="datetime-local"
                      required 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Agendar Post</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Posts Agendados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {posts.filter(p => p.status === 'scheduled').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Posts Publicados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {posts.filter(p => p.status === 'published').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total de Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {posts.length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      <Badge variant={
                        post.status === 'published' ? 'default' :
                        post.status === 'scheduled' ? 'secondary' : 'destructive'
                      }>
                        {post.status === 'published' ? 'Publicado' :
                         post.status === 'scheduled' ? 'Agendado' : 'Falhou'}
                      </Badge>
                      <div className="flex gap-1">
                        {post.platforms.map((platform) => (
                          <Badge 
                            key={platform} 
                            className={`${getPlatformColor(platform)} text-white`}
                          >
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {post.status === 'published' && post.published_at 
                          ? `Publicado em ${new Date(post.published_at).toLocaleString('pt-BR')}`
                          : `Agendado para ${new Date(post.scheduled_for).toLocaleString('pt-BR')}`
                        }
                      </span>
                    </CardDescription>
                  </div>
                  {post.image_url && (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                {post.image_url && (
                  <div className="mt-4">
                    <img 
                      src={post.image_url} 
                      alt="Post" 
                      className="rounded-lg max-h-64 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {posts.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Share2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum post criado ainda</h3>
              <p className="text-muted-foreground mb-6">
                Comece criando seu primeiro post para redes sociais!
              </p>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SocialPostsSystem;