import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Camera, Upload, Trash2, ZoomIn, Loader2, ImageIcon, X } from 'lucide-react';

interface EvidencePhoto {
  id: string;
  service_order_id: string;
  customer_product_id: string;
  uploaded_by: string;
  category: string;
  caption: string | null;
  storage_path: string;
  file_name: string | null;
  file_size_bytes: number | null;
  created_at: string;
}

interface FleetEvidencePhotosProps {
  serviceOrderId: string;
  customerProductId: string;
  uploadedBy?: string;
  readOnly?: boolean;
}

const CATEGORIES = [
  { value: 'entrada', label: 'Entrada do Veículo' },
  { value: 'dano_existente', label: 'Danos Pré-existentes' },
  { value: 'peca_substituida', label: 'Peça Substituída' },
  { value: 'servico_realizado', label: 'Serviço Realizado' },
  { value: 'finalizacao', label: 'Finalização' },
  { value: 'geral', label: 'Geral' },
];

const SUPABASE_URL = 'https://lqduauyrwwlrbtnxkiev.supabase.co';

export function FleetEvidencePhotos({ serviceOrderId, customerProductId, uploadedBy = 'sistema', readOnly = false }: FleetEvidencePhotosProps) {
  const [photos, setPhotos] = useState<EvidencePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('geral');
  const [caption, setCaption] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<EvidencePhoto | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const loadPhotos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('fleet_evidence_photos')
        .select('*')
        .eq('service_order_id', serviceOrderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPhotos((data as EvidencePhoto[]) || []);
    } catch (err) {
      console.error('Error loading evidence photos:', err);
    } finally {
      setLoading(false);
    }
  }, [serviceOrderId]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  const getPublicUrl = (storagePath: string) => {
    return `${SUPABASE_URL}/storage/v1/object/public/fleet_docs/${storagePath}`;
  };

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} não é uma imagem válida.`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} excede 10MB.`);
          continue;
        }

        const ext = file.name.split('.').pop() || 'jpg';
        const path = `evidence/${serviceOrderId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('fleet_docs')
          .upload(path, file, { contentType: file.type });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }

        const { error: insertError } = await supabase
          .from('fleet_evidence_photos')
          .insert({
            service_order_id: serviceOrderId,
            customer_product_id: customerProductId,
            uploaded_by: uploadedBy,
            category: selectedCategory,
            caption: caption || null,
            storage_path: path,
            file_name: file.name,
            file_size_bytes: file.size,
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          toast.error('Erro ao registrar foto.');
        }
      }

      toast.success('Foto(s) enviada(s) com sucesso!');
      setCaption('');
      await loadPhotos();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erro no upload.');
    } finally {
      setUploading(false);
    }
  }, [serviceOrderId, customerProductId, uploadedBy, selectedCategory, caption, loadPhotos]);

  const handleDelete = useCallback(async (photo: EvidencePhoto) => {
    try {
      await supabase.storage.from('fleet_docs').remove([photo.storage_path]);
      await supabase.from('fleet_evidence_photos').delete().eq('id', photo.id);
      toast.success('Foto removida.');
      await loadPhotos();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Erro ao remover foto.');
    }
  }, [loadPhotos]);

  const filteredPhotos = filterCategory === 'all'
    ? photos
    : photos.filter(p => p.category === filterCategory);

  const categoryLabel = (cat: string) => CATEGORIES.find(c => c.value === cat)?.label || cat;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      {!readOnly && (
        <Card className="border border-dashed border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Camera className="w-4 h-4 text-primary" />
              Adicionar Evidências
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Legenda (opcional)"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                className="text-xs h-9 col-span-1 sm:col-span-2"
              />
            </div>

            <label className="flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <Upload className="w-4 h-4 text-primary" />
              )}
              <span className="text-xs font-medium text-muted-foreground">
                {uploading ? 'Enviando...' : 'Clique ou arraste fotos aqui'}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                disabled={uploading}
                onChange={e => handleUpload(e.target.files)}
              />
            </label>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      {photos.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">Filtrar:</span>
          <Button
            variant={filterCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            className="text-[10px] h-7 px-2.5"
            onClick={() => setFilterCategory('all')}
          >
            Todas ({photos.length})
          </Button>
          {[...new Set(photos.map(p => p.category))].map(cat => (
            <Button
              key={cat}
              variant={filterCategory === cat ? 'default' : 'outline'}
              size="sm"
              className="text-[10px] h-7 px-2.5"
              onClick={() => setFilterCategory(cat)}
            >
              {categoryLabel(cat)} ({photos.filter(p => p.category === cat).length})
            </Button>
          ))}
        </div>
      )}

      {/* Gallery */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-8">
          <ImageIcon className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma foto de evidência registrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredPhotos.map(photo => (
            <div key={photo.id} className="group relative rounded-lg overflow-hidden border border-border/50 bg-muted/20">
              <div className="aspect-square">
                <img
                  src={getPublicUrl(photo.storage_path)}
                  alt={photo.caption || photo.file_name || 'Evidência'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setPreviewPhoto(photo)}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                {!readOnly && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8 rounded-full"
                    onClick={() => handleDelete(photo)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Info */}
              <div className="p-2 space-y-1">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                  {categoryLabel(photo.category)}
                </Badge>
                {photo.caption && (
                  <p className="text-[10px] text-muted-foreground truncate">{photo.caption}</p>
                )}
                <p className="text-[9px] text-muted-foreground/60">
                  {new Date(photo.created_at).toLocaleDateString('pt-BR')} · {photo.uploaded_by}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-screen Preview Dialog */}
      <Dialog open={!!previewPhoto} onOpenChange={(open) => { if (!open) setPreviewPhoto(null); }}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/95 border-none">
          {previewPhoto && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 z-10 text-white hover:bg-white/20 h-8 w-8"
                onClick={() => setPreviewPhoto(null)}
              >
                <X className="w-5 h-5" />
              </Button>
              <img
                src={getPublicUrl(previewPhoto.storage_path)}
                alt={previewPhoto.caption || 'Evidência'}
                className="w-full max-h-[80vh] object-contain"
              />
              <div className="p-4 bg-black/80 text-white space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-white/30 text-white/80">
                    {categoryLabel(previewPhoto.category)}
                  </Badge>
                  <span className="text-xs text-white/60">
                    {new Date(previewPhoto.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {previewPhoto.caption && (
                  <p className="text-sm text-white/90">{previewPhoto.caption}</p>
                )}
                <p className="text-[10px] text-white/50">
                  Enviado por: {previewPhoto.uploaded_by} · {previewPhoto.file_name}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
