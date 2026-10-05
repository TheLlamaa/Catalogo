import type { Dispatch, RefObject, SetStateAction } from 'react';
import { SETTING_FIELDS } from '../lib/settings';
import type { Settings } from '../lib/settings';
import type { AuthUser } from '../services/auth';
import type { CatalogOrder, Category, CustomOrder, OrderTable, SettingRow, StoredProduct, Toast } from '../types';
import { upsertProduct, setModelUrl, deleteProductRow, upsertCategory, deleteCategoryRow, updateSortOrders } from '../services/catalog';
import { insertOrder, deleteOrderRow, setOrderStatus } from '../services/orders';
import { upsertSettings, deleteSettings } from '../services/settings';

interface AdminActionsDeps {
  toast: Toast;
  fetchData: () => Promise<void>;
  schemaRef: RefObject<boolean>;
  userRef: RefObject<AuthUser | null>;
  products: StoredProduct[];
  setProducts: Dispatch<SetStateAction<StoredProduct[]>>;
  categories: Category[];
  setCategories: Dispatch<SetStateAction<Category[]>>;
  rawSettings: SettingRow[];
  settings: Settings;
  setCustomOrders: Dispatch<SetStateAction<CustomOrder[]>>;
  setCatalogOrders: Dispatch<SetStateAction<CatalogOrder[]>>;
  clearCart: () => void;
}

// Mudanças de configuração: chave -> novo valor (null volta ao padrão)
type SettingChanges = Record<string, string | null>;

// Ações do painel e dos pedidos: monta os dados, chama os serviços (src/services), mostra o aviso e recarrega.
export function useAdminActions({
  toast, fetchData, schemaRef, userRef, products, setProducts, categories, setCategories,
  rawSettings, settings, setCustomOrders, setCatalogOrders, clearCart,
}: AdminActionsDeps) {
  // -------------------------------------------------------------------------
  // Produtos e categorias (admin)
  // -------------------------------------------------------------------------
  const saveProduct = async (product: Partial<StoredProduct>) => {
    const payload: Record<string, unknown> = {
      title: product.title,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category_ids: product.categoryIds || [],
      image_urls: product.imageUrls || [],
      active: product.active,
      aura_color: product.auraColor || 'inherit',
      options: product.options || [],
      lead_time: product.leadTime || null
    };
    if (schemaRef.current) {
      payload.badge = (product.badge || '').trim() || null;
      payload.section = product.section || null;
    } else if ((product.badge || '').trim() || product.section) {
      toast.info('Selo e vitrine ainda não foram salvos: falta rodar o SQL 06 no Supabase (supabase/06-personalizacao.sql).');
    }
    if (product.id) payload.id = product.id;

    const { data: saved, error } = await upsertProduct(payload);
    if (error) {
      toast.error(`Erro ao salvar produto: ${error.message}`);
      return false;
    }

    // Link do modelo 3D (admin): tabela separada. Só mexe se mudou.
    const newUrl = (product.modelUrl || '').trim();
    const oldUrl = product.id ? (products.find(p => p.id === product.id)?.modelUrl || '') : '';
    const copiedFromOther = !product.id && newUrl; // duplicação: copia o link para o novo produto
    if (newUrl !== oldUrl || copiedFromOther) {
      const { error: privError } = await setModelUrl(saved.id, newUrl);
      if (privError) {
        toast.error(`Produto salvo, mas o link do modelo não foi salvo: ${privError.message}`);
        await fetchData();
        return true;
      }
    }
    toast.success('Produto salvo.');
    await fetchData();
    return true;
  };

  // Textos do site: changes = { chave: 'valor' | null }. null volta ao padrão.
  // Antes de gravar, guarda o valor antigo das chaves mudadas (settingsBackup) para o botão "Desfazer".
  const saveSettings = async (changes: SettingChanges, successMessage = 'Site atualizado.', { noBackup = false } = {}) => {
    const now = new Date().toISOString();
    const toSave: (SettingRow & { updated_at: string })[] = Object.entries(changes).filter((entry): entry is [string, string] => entry[1] !== null).map(([key, value]) => ({ key, value, updated_at: now }));
    const toReset = Object.entries(changes).filter(([, v]) => v === null).map(([key]) => key);

    if (noBackup) {
      toReset.push('settingsBackup');
    } else {
      const old = Object.fromEntries(Object.keys(changes).map(k => [k, rawSettings.find(r => r.key === k)?.value ?? null]));
      const backup = JSON.stringify({ t: now, v: old });
      if (backup.length <= 5000) toSave.push({ key: 'settingsBackup', value: backup, updated_at: now });
      else toReset.push('settingsBackup'); // grande demais para desfazer: melhor não oferecer um "desfazer" velho
    }

    if (toSave.length) {
      const { error } = await upsertSettings(toSave);
      if (error) { toast.error(`Erro ao salvar: ${error.message}`); return false; }
    }
    if (toReset.length) {
      const { error } = await deleteSettings(toReset);
      if (error) { toast.error(`Erro ao salvar: ${error.message}`); return false; }
    }
    toast.success(successMessage);
    await fetchData();
    return true;
  };

  // Volta as chaves da última publicação ao valor que tinham antes
  const undoSettings = async () => {
    const backup = settings.backup;
    if (!backup) return false;
    const allowed = new Set([...SETTING_FIELDS.map(f => f.key), 'customAuras', 'auraOverrides']);
    const changes: SettingChanges = {};
    for (const [key, value] of Object.entries(backup.v)) {
      if (allowed.has(key) && (value === null || typeof value === 'string')) changes[key] = value;
    }
    return saveSettings(changes, 'Última publicação desfeita.', { noBackup: true });
  };

  // Reordena produtos ou categorias: recebe os ids na nova ordem e grava só o que mudou
  const reorder = <T extends { id: string; sortOrder: number }>(table: 'products' | 'categories', list: T[], setList: Dispatch<SetStateAction<T[]>>) => async (orderedIds: string[]) => {
    if (!schemaRef.current) { toast.error('Para reordenar, falta rodar o SQL 06 no Supabase (supabase/06-personalizacao.sql).'); return false; }
    const current = new Map(list.map(i => [i.id, i.sortOrder]));
    const updates = orderedIds.map((id, idx) => ({ id, sort_order: idx + 1 })).filter(u => current.get(u.id) !== u.sort_order);
    if (!updates.length) return true;
    const next = new Map(updates.map(u => [u.id, u.sort_order]));
    setList(prev => prev.map(i => (next.has(i.id) ? { ...i, sortOrder: next.get(i.id) } : i)));
    const results = await updateSortOrders(table, updates);
    const failedError = results.find(r => r.error)?.error;
    if (failedError) toast.error(`Erro ao reordenar: ${failedError.message}`);
    await fetchData();
    return !failedError;
  };
  const reorderProducts = reorder('products', products, setProducts);
  const reorderCategories = reorder('categories', categories, setCategories);

  const deleteProduct = async (id: string) => {
    const { error } = await deleteProductRow(id);
    if (error) return toast.error(`Erro ao remover produto: ${error.message}`);
    toast.success('Produto excluído.');
    await fetchData();
  };

  const saveCategory = async (category: Partial<Category> & { name: string }) => {
    const slug = category.name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
    const payload: Record<string, unknown> = { name: category.name, slug, description: category.description, aura_color: category.auraColor || 'none' };
    if (category.id) payload.id = category.id;
    else if (schemaRef.current) payload.sort_order = categories.reduce((m, c) => Math.max(m, c.sortOrder), 0) + 1; // nova categoria vai para o fim

    const { error } = await upsertCategory(payload);
    if (error) {
      toast.error(`Erro ao salvar categoria: ${error.message}`);
      return false;
    }
    toast.success('Categoria salva.');
    await fetchData();
    return true;
  };

  const deleteCategory = async (id: string) => {
    const { error } = await deleteCategoryRow(id);
    if (error) return toast.error(`Erro ao remover categoria: ${error.message}`);
    toast.success('Categoria excluída.');
    await fetchData();
  };

  // -------------------------------------------------------------------------
  // Pedidos
  // -------------------------------------------------------------------------
  const saveCustomOrder = async (orderData: Record<string, unknown>) => {
    const { error } = await insertOrder('custom_orders', orderData);
    if (error) {
      console.error('Erro ao salvar pedido customizado:', error);
      toast.error(`Não foi possível enviar a solicitação: ${error.message}`);
      return false;
    }
    if (userRef.current) await fetchData();
    return true;
  };

  const saveCatalogOrder = async (orderData: Record<string, unknown>) => {
    const { error } = await insertOrder('orders', orderData);
    if (error) {
      console.error('Erro ao realizar pedido:', error);
      toast.error(`Não foi possível enviar o pedido: ${error.message}`);
      return false;
    }
    clearCart();
    if (userRef.current) await fetchData();
    return true;
  };

  const deleteOrder = <T extends { id: string }>(table: OrderTable, setList: Dispatch<SetStateAction<T[]>>, selectedId: string | null | undefined, clearSelected: () => void) => async (id: string) => {
    const { error } = await deleteOrderRow(table, id);
    if (error) return toast.error(`Erro ao excluir: ${error.message}`);
    if (selectedId === id) clearSelected();
    setList(list => list.filter(o => o.id !== id));
    toast.success('Pedido excluído.');
  };

  const updateOrderStatus = async (table: OrderTable, id: string, status: string) => {
    const { error } = await setOrderStatus(table, id, status);
    if (error) return toast.error(`Erro ao atualizar o status: ${error.message}`);
    const patch = <T extends { id: string }>(list: T[]) => list.map(o => (o.id === id ? { ...o, status } : o));
    if (table === 'orders') setCatalogOrders(patch); else setCustomOrders(patch);
  };

  return {
    saveProduct, deleteProduct, saveCategory, deleteCategory, reorderProducts, reorderCategories,
    saveSettings, undoSettings, saveCustomOrder, saveCatalogOrder, deleteOrder, updateOrderStatus,
  };
}
