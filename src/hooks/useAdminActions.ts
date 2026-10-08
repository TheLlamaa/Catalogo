import type { Dispatch, RefObject, SetStateAction } from 'react';
import { buildSettingsWrite, undoChanges } from '../lib/settingsWrite';
import type { SettingChanges } from '../lib/settingsWrite';
import type { Settings } from '../lib/settings';
import type { AuthUser } from '../services/auth';
import type { CatalogOrder, Category, CustomOrder, OrderTable, SettingRow, StoredProduct, Toast } from '../types';
import { gateway } from '../services/gateway';
import type { Capabilities, ProductPatch } from '../services/gateway';
import { friendlyError } from '../lib/errorMessage';
import { reorderUpdates } from '../lib/sortOrder';

interface AdminActionsDeps {
  toast: Toast;
  fetchData: () => Promise<void>;
  capabilitiesRef: RefObject<Capabilities>;
  userRef: RefObject<AuthUser | null>;
  products: StoredProduct[];
  setProducts: Dispatch<SetStateAction<StoredProduct[]>>;
  categories: Category[];
  setCategories: Dispatch<SetStateAction<Category[]>>;
  rawSettings: SettingRow[];
  settings: Settings;
  setCustomOrders: Dispatch<SetStateAction<CustomOrder[]>>;
  setCatalogOrders: Dispatch<SetStateAction<CatalogOrder[]>>;
}

// Ações do painel e dos pedidos: chama o gateway (src/services/gateway.ts), mostra o aviso e recarrega.
export function useAdminActions({
  toast, fetchData, capabilitiesRef, userRef, products, setProducts, categories, setCategories,
  rawSettings, settings, setCustomOrders, setCatalogOrders,
}: AdminActionsDeps) {
  // -------------------------------------------------------------------------
  // Produtos e categorias (admin)
  // -------------------------------------------------------------------------
  const SQL_06_HINT = 'falta rodar o SQL 06 no Supabase (supabase/06-personalizacao.sql).';

  const saveProduct = async (product: Partial<StoredProduct>, successMessage = 'Produto salvo.') => {
    const capabilities = capabilitiesRef.current;
    if (!capabilities.ordering && ((product.badge || '').trim() || product.section)) {
      toast.info(`Selo e vitrine ainda não foram salvos: ${SQL_06_HINT}`);
    }
    if (!capabilities.productInfo && ((product.specs?.length ?? 0) > 0 || (product.details?.length ?? 0) > 0)) {
      toast.info('Características e informações extras ainda não foram salvas: falta rodar o SQL 18 no Supabase (supabase/18-detalhes-do-produto.sql).');
    }
    const previousModelUrl = product.id ? (products.find(p => p.id === product.id)?.modelUrl || '') : '';
    const { error, modelUrlError } = await gateway().saveProduct(product, { capabilities, previousModelUrl });
    if (error) {
      toast.error(`Não foi possível salvar o produto. ${friendlyError(error)}`);
      return false;
    }
    if (modelUrlError) {
      toast.error(`Produto salvo, mas o link do modelo não. ${friendlyError(modelUrlError)}`);
      await fetchData();
      return true;
    }
    toast.success(successMessage);
    await fetchData();
    return true;
  };

  // Edição rápida (estoque, visibilidade, aura, vitrine, preço): grava só os campos pedidos, sem regravar o produto inteiro
  const patchProduct = async (id: string, patch: ProductPatch, successMessage = 'Produto salvo.') => {
    const capabilities = capabilitiesRef.current;
    if (patch.section !== undefined && !capabilities.ordering) {
      toast.info(`Vitrine ainda não foi salva: ${SQL_06_HINT}`);
      return false;
    }
    const { error } = await gateway().patchProduct(id, patch, { capabilities });
    if (error) {
      toast.error(`Não foi possível salvar o produto. ${friendlyError(error)}`);
      return false;
    }
    toast.success(successMessage);
    await fetchData();
    return true;
  };

  // Edição em massa: grava vários produtos de uma vez e conta quantos deram certo
  const bulkPatchProducts = async (updates: { id: string; patch: ProductPatch }[], doneMessage: string) => {
    const capabilities = capabilitiesRef.current;
    if (updates.some(u => u.patch.section !== undefined) && !capabilities.ordering) {
      toast.info(`Vitrine ainda não foi salva: ${SQL_06_HINT}`);
      return false;
    }
    if (updates.some(u => u.patch.discountPercent !== undefined) && !capabilities.discount) {
      toast.info('Desconto ainda não está disponível: rode o arquivo 13-desconto.sql no Supabase.');
      return false;
    }
    const { error, failedIds } = await gateway().patchProducts(updates, { capabilities });
    if (error) {
      const done = updates.length - failedIds.length;
      toast.error(`${done} de ${updates.length} produtos foram alterados; ${failedIds.length} falharam. ${friendlyError(error)}`);
    } else {
      toast.success(doneMessage);
    }
    await fetchData();
    return !error;
  };

  // Textos do site: changes = { chave: 'valor' | null }. null volta ao padrão.
  // Antes de gravar, guarda o valor antigo das chaves mudadas (settingsBackup) para o botão "Desfazer".
  const saveSettings = async (changes: SettingChanges, successMessage = 'Site atualizado.', options: { noBackup?: boolean } = {}) => {
    const { error } = await gateway().writeSettings(buildSettingsWrite(changes, rawSettings, new Date().toISOString(), options));
    if (error) { toast.error(`Não foi possível publicar. ${friendlyError(error)}`); return false; }
    toast.success(successMessage);
    await fetchData();
    return true;
  };

  // Volta as chaves da última publicação ao valor que tinham antes
  const undoSettings = async () => {
    const backup = settings.backup;
    if (!backup) return false;
    return saveSettings(undoChanges(backup), 'Última publicação desfeita.', { noBackup: true });
  };

  // Reordena produtos ou categorias: recebe os ids na nova ordem e grava só o que mudou
  const reorder = <T extends { id: string; sortOrder: number }>(table: 'products' | 'categories', list: T[], setList: Dispatch<SetStateAction<T[]>>) => async (orderedIds: string[]) => {
    if (!capabilitiesRef.current.ordering) { toast.error(`Para reordenar, ${SQL_06_HINT}`); return false; }
    const updates = reorderUpdates(list, orderedIds);
    if (!updates.length) return true;
    const next = new Map(updates.map(u => [u.id, u.sortOrder]));
    setList(prev => prev.map(i => (next.has(i.id) ? { ...i, sortOrder: next.get(i.id) } : i)));
    const { error: failedError } = await gateway().reorder(table, updates);
    if (failedError) toast.error(`A nova ordem não foi salva. ${friendlyError(failedError)}`);
    await fetchData();
    return !failedError;
  };
  const reorderProducts = reorder('products', products, setProducts);
  const reorderCategories = reorder('categories', categories, setCategories);

  const deleteProduct = async (id: string) => {
    const { error } = await gateway().deleteProduct(id);
    if (error) return toast.error(`Não foi possível excluir o produto. ${friendlyError(error)}`);
    toast.success('Produto excluído.');
    await fetchData();
  };

  const saveCategory = async (category: Partial<Category> & { name: string }, successMessage = 'Categoria salva.') => {
    // nova categoria vai para o fim
    const sortOrderIfNew = categories.reduce((m, c) => Math.max(m, c.sortOrder), 0) + 1;
    const { error } = await gateway().saveCategory(category, { capabilities: capabilitiesRef.current, sortOrderIfNew });
    if (error) {
      toast.error(`Não foi possível salvar a categoria. ${friendlyError(error)}`);
      return false;
    }
    toast.success(successMessage);
    await fetchData();
    return true;
  };

  const deleteCategory = async (id: string) => {
    const { error } = await gateway().deleteCategory(id);
    if (error) return toast.error(`Não foi possível excluir a categoria. ${friendlyError(error)}`);
    toast.success('Categoria excluída.');
    await fetchData();
  };

  // -------------------------------------------------------------------------
  // Pedidos
  // -------------------------------------------------------------------------
  const saveCustomOrder = async (orderData: Record<string, unknown>) => {
    const { error } = await gateway().insertOrder('custom_orders', orderData);
    if (error) {
      console.error('Erro ao salvar pedido customizado:', error);
      toast.error(`Não foi possível enviar a solicitação. ${friendlyError(error)}`);
      return false;
    }
    if (userRef.current) await fetchData();
    return true;
  };

  const saveCatalogOrder = async (orderData: Record<string, unknown>) => {
    const { error } = await gateway().insertOrder('orders', orderData);
    if (error) {
      console.error('Erro ao realizar pedido:', error);
      toast.error(`Não foi possível enviar o pedido. ${friendlyError(error)}`);
      return false;
    }
    if (userRef.current) await fetchData();
    return true;
  };

  const deleteOrder = async (table: OrderTable, id: string) => {
    const { error } = await gateway().deleteOrder(table, id);
    if (error) { toast.error(`Não foi possível excluir. ${friendlyError(error)}`); return false; }
    const drop = <T extends { id: string }>(list: T[]) => list.filter(o => o.id !== id);
    if (table === 'orders') setCatalogOrders(drop); else setCustomOrders(drop);
    toast.success('Pedido excluído.');
    return true;
  };

  const updateOrderStatus = async (table: OrderTable, id: string, status: string) => {
    const { error } = await gateway().setOrderStatus(table, id, status);
    if (error) return toast.error(`O status não foi alterado. ${friendlyError(error)}`);
    const patch = <T extends { id: string }>(list: T[]) => list.map(o => (o.id === id ? { ...o, status } : o));
    if (table === 'orders') setCatalogOrders(patch); else setCustomOrders(patch);
  };

  return {
    saveProduct, patchProduct, bulkPatchProducts, deleteProduct, saveCategory, deleteCategory, reorderProducts, reorderCategories,
    saveSettings, undoSettings, saveCustomOrder, saveCatalogOrder, deleteOrder, updateOrderStatus,
  };
}
