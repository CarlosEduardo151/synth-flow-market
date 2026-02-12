import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { allProducts as catalogProducts } from '@/products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  Package,
  RefreshCw,
  Tag,
  FolderEdit,
  MoreHorizontal
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Product {
  id: string;
  name: string;
  description: string | null;
  sale_price: number;
  cost_price: number;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

interface CategoryStats {
  name: string;
  count: number;
  totalValue: number;
}

export function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [syncing, setSyncing] = useState(false);
  
  // Category management
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false);
  
  // Product delete confirmation
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleteProductDialogOpen, setIsDeleteProductDialogOpen] = useState(false);

  // Custom categories stored in localStorage
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('admin_custom_categories');
    return saved ? JSON.parse(saved) : [];
  });

  const defaultCategories = [
    'Serviços',
    'Produtos Físicos',
    'Produtos Digitais',
    'Consultoria',
    'Assinaturas',
    'Micro-Empresas',
    'Agentes de IA',
    'IA Automatizada',
    'Trading',
    'NFC',
    'Outros'
  ];

  const allCategories = [...new Set([...defaultCategories, ...customCategories])];

  useEffect(() => {
    fetchProducts();
    syncCatalogProducts();
  }, []);

  useEffect(() => {
    localStorage.setItem('admin_custom_categories', JSON.stringify(customCategories));
  }, [customCategories]);

  const syncCatalogProducts = async () => {
    setSyncing(true);
    try {
      const { data: existingProducts } = await supabase
        .from('admin_products')
        .select('name');

      const existingNames = new Set(existingProducts?.map(p => p.name?.toLowerCase()) || []);

      const newProducts = catalogProducts.filter(
        product => !existingNames.has(product.title.toLowerCase())
      );

      if (newProducts.length === 0) {
        setSyncing(false);
        return;
      }

      const productsToInsert = newProducts.map(product => ({
        name: product.title,
        description: product.short || null,
        sale_price: product.price / 100,
        cost_price: 0,
        category: getCategoryName(product.category),
        is_active: product.inStock
      }));

      const { error: insertError } = await supabase
        .from('admin_products')
        .insert(productsToInsert);

      if (insertError) {
        toast({ 
          title: "Erro ao sincronizar", 
          description: insertError.message,
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: `${newProducts.length} produto(s) sincronizado(s)!` 
        });
        fetchProducts();
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({ 
        title: "Erro ao sincronizar produtos", 
        variant: "destructive" 
      });
    }
    setSyncing(false);
  };

  const getCategoryName = (slug: string): string => {
    const categoryMap: Record<string, string> = {
      'micro-empresas': 'Micro-Empresas',
      'agentes-de-ia': 'Agentes de IA',
      'ia-automatizada': 'IA Automatizada',
      'trading': 'Trading',
      'nfc': 'NFC'
    };
    return categoryMap[slug] || 'Outros';
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_products')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const productData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      sale_price: parseFloat(formData.get('sale_price') as string),
      cost_price: parseFloat(formData.get('cost_price') as string) || 0,
      category: formData.get('category') as string || null,
      is_active: true
    };

    let error;
    if (editingProduct) {
      ({ error } = await supabase
        .from('admin_products')
        .update(productData)
        .eq('id', editingProduct.id));
    } else {
      ({ error } = await supabase
        .from('admin_products')
        .insert(productData));
    }

    if (!error) {
      toast({ 
        title: editingProduct ? "Produto atualizado!" : "Produto adicionado!" 
      });
      setIsAddingProduct(false);
      setEditingProduct(null);
      fetchProducts();
    } else {
      toast({ 
        title: "Erro ao salvar produto", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    const { error } = await supabase
      .from('admin_products')
      .delete()
      .eq('id', productToDelete.id);

    if (!error) {
      toast({ title: "Produto excluído!" });
      fetchProducts();
    } else {
      toast({ 
        title: "Erro ao excluir produto", 
        variant: "destructive" 
      });
    }
    setProductToDelete(null);
    setIsDeleteProductDialogOpen(false);
  };

  const toggleProductStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('admin_products')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (!error) {
      toast({ title: currentStatus ? "Produto desativado" : "Produto ativado" });
      fetchProducts();
    }
  };

  // Category management functions
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    
    if (allCategories.includes(newCategoryName.trim())) {
      toast({ title: "Categoria já existe!", variant: "destructive" });
      return;
    }
    
    setCustomCategories(prev => [...prev, newCategoryName.trim()]);
    setNewCategoryName('');
    setIsCategoryDialogOpen(false);
    toast({ title: "Categoria criada!" });
  };

  const handleRenameCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) return;
    
    // Update all products with this category
    const { error } = await supabase
      .from('admin_products')
      .update({ category: newCategoryName.trim() })
      .eq('category', editingCategory);

    if (!error) {
      // Update custom categories if it was a custom one
      if (customCategories.includes(editingCategory)) {
        setCustomCategories(prev => 
          prev.map(c => c === editingCategory ? newCategoryName.trim() : c)
        );
      }
      toast({ title: "Categoria renomeada!" });
      fetchProducts();
    } else {
      toast({ title: "Erro ao renomear categoria", variant: "destructive" });
    }
    
    setEditingCategory(null);
    setNewCategoryName('');
    setIsCategoryDialogOpen(false);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    // Set category to null for all products in this category
    const { error } = await supabase
      .from('admin_products')
      .update({ category: null })
      .eq('category', categoryToDelete);

    if (!error) {
      // Remove from custom categories if it was a custom one
      setCustomCategories(prev => prev.filter(c => c !== categoryToDelete));
      toast({ title: "Categoria excluída! Produtos movidos para 'Sem categoria'." });
      fetchProducts();
    } else {
      toast({ title: "Erro ao excluir categoria", variant: "destructive" });
    }
    
    setCategoryToDelete(null);
    setIsDeleteCategoryDialogOpen(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculateProfit = (sale: number, cost: number) => {
    const profit = sale - cost;
    const percentage = cost > 0 ? ((profit / cost) * 100).toFixed(1) : '∞';
    return { profit, percentage };
  };

  // Get unique categories from products
  const categoriesFromProducts = [...new Set(products.map(p => p.category).filter(Boolean))] as string[];
  const allUsedCategories = [...new Set([...allCategories, ...categoriesFromProducts])];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Category stats
  const categoryStats: CategoryStats[] = allUsedCategories.map(cat => ({
    name: cat,
    count: products.filter(p => p.category === cat).length,
    totalValue: products.filter(p => p.category === cat).reduce((sum, p) => sum + Number(p.sale_price), 0)
  })).filter(c => c.count > 0).sort((a, b) => b.count - a.count);

  const uncategorizedCount = products.filter(p => !p.category).length;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Categorias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products.length}</div>
                <p className="text-xs text-muted-foreground">
                  {products.filter(p => p.is_active).length} ativos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    products.length > 0 
                      ? products.reduce((sum, p) => sum + Number(p.sale_price), 0) / products.length 
                      : 0
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margem Média</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">
                  {products.length > 0 
                    ? (products.reduce((sum, p) => {
                        const margin = Number(p.cost_price) > 0 
                          ? ((Number(p.sale_price) - Number(p.cost_price)) / Number(p.sale_price)) * 100
                          : 100;
                        return sum + margin;
                      }, 0) / products.length).toFixed(1)
                    : 0
                  }%
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle>Produtos Cadastrados</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    onClick={syncCatalogProducts}
                    disabled={syncing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Sincronizar
                  </Button>
                  <Button onClick={() => setIsAddingProduct(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Produto
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas ({products.length})</SelectItem>
                    {categoryStats.map(cat => (
                      <SelectItem key={cat.name} value={cat.name}>
                        {cat.name} ({cat.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tabela */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Preço</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="text-right">Lucro</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => {
                        const { profit, percentage } = calculateProfit(Number(product.sale_price), Number(product.cost_price));
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                {product.description && (
                                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                    {product.description}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{product.category || 'Sem categoria'}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(Number(product.sale_price))}
                            </TableCell>
                            <TableCell className="text-right">
                              {Number(product.cost_price) > 0 
                                ? formatCurrency(Number(product.cost_price))
                                : <span className="text-muted-foreground">R$ 0,00</span>
                              }
                            </TableCell>
                            <TableCell className="text-right">
                              <div>
                                <p className="font-medium text-emerald-500">{formatCurrency(profit)}</p>
                                <p className="text-xs text-muted-foreground">{percentage}%</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={product.is_active}
                                onCheckedChange={() => toggleProductStatus(product.id, product.is_active)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setEditingProduct(product);
                                    setIsAddingProduct(true);
                                  }}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => {
                                      setProductToDelete(product);
                                      setIsDeleteProductDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredProducts.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhum produto encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Gerenciar Categorias</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crie, renomeie ou exclua categorias de produtos
                  </p>
                </div>
                <Button onClick={() => {
                  setEditingCategory(null);
                  setNewCategoryName('');
                  setIsCategoryDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Categoria
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-center">Produtos</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryStats.map((cat) => (
                      <TableRow key={cat.name}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{cat.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{cat.count}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(cat.totalValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setEditingCategory(cat.name);
                                setNewCategoryName(cat.name);
                                setIsCategoryDialogOpen(true);
                              }}>
                                <FolderEdit className="h-4 w-4 mr-2" />
                                Renomear
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  setCategoryToDelete(cat.name);
                                  setIsDeleteCategoryDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {uncategorizedCount > 0 && (
                      <TableRow>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-muted-foreground">Sem categoria</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{uncategorizedCount}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-muted-foreground">
                          {formatCurrency(products.filter(p => !p.category).reduce((sum, p) => sum + Number(p.sale_price), 0))}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                    {categoryStats.length === 0 && uncategorizedCount === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Nenhuma categoria encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para adicionar/editar produto */}
      <Dialog open={isAddingProduct} onOpenChange={(open) => {
        setIsAddingProduct(open);
        if (!open) setEditingProduct(null);
      }}>
        <DialogContent>
          <form onSubmit={handleSaveProduct}>
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
              <DialogDescription>
                Cadastre um produto com seu preço de venda e custo
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome do Produto *</Label>
                <Input 
                  id="name" 
                  name="name" 
                  defaultValue={editingProduct?.name || ''} 
                  required 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  defaultValue={editingProduct?.description || ''} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sale_price">Preço de Venda *</Label>
                  <Input 
                    id="sale_price" 
                    name="sale_price" 
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingProduct?.sale_price || ''} 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cost_price">Custo</Label>
                  <Input 
                    id="cost_price" 
                    name="cost_price" 
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingProduct?.cost_price || '0'} 
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Categoria</Label>
                <Select name="category" defaultValue={editingProduct?.category || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsedCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsAddingProduct(false);
                setEditingProduct(null);
              }}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingProduct ? 'Atualizar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para adicionar/renomear categoria */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Renomear Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? 'Altere o nome da categoria. Todos os produtos serão atualizados.'
                : 'Digite o nome da nova categoria'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="categoryName">Nome da Categoria</Label>
              <Input 
                id="categoryName" 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Produtos Premium"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setIsCategoryDialogOpen(false);
              setEditingCategory(null);
              setNewCategoryName('');
            }}>
              Cancelar
            </Button>
            <Button onClick={editingCategory ? handleRenameCategory : handleAddCategory}>
              {editingCategory ? 'Renomear' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para excluir produto */}
      <AlertDialog open={isDeleteProductDialogOpen} onOpenChange={setIsDeleteProductDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{productToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog para excluir categoria */}
      <AlertDialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{categoryToDelete}"? 
              Os produtos desta categoria serão movidos para "Sem categoria".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
