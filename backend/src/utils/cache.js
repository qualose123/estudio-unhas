const NodeCache = require('node-cache');

/**
 * Sistema de cache em memória
 * Usado principalmente para cachear horários disponíveis e reduzir consultas ao banco
 */

// Cache com TTL de 5 minutos (300 segundos)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Obter valor do cache
 */
const get = (key) => {
  try {
    return cache.get(key);
  } catch (err) {
    console.error('Erro ao buscar do cache:', err);
    return undefined;
  }
};

/**
 * Salvar valor no cache
 */
const set = (key, value, ttl = null) => {
  try {
    if (ttl) {
      return cache.set(key, value, ttl);
    }
    return cache.set(key, value);
  } catch (err) {
    console.error('Erro ao salvar no cache:', err);
    return false;
  }
};

/**
 * Deletar chave do cache
 */
const del = (key) => {
  try {
    return cache.del(key);
  } catch (err) {
    console.error('Erro ao deletar do cache:', err);
    return 0;
  }
};

/**
 * Limpar todas as chaves que começam com determinado prefixo
 */
const deleteByPrefix = (prefix) => {
  try {
    const keys = cache.keys();
    const keysToDelete = keys.filter(key => key.startsWith(prefix));
    return cache.del(keysToDelete);
  } catch (err) {
    console.error('Erro ao deletar por prefixo:', err);
    return 0;
  }
};

/**
 * Limpar todo o cache
 */
const flush = () => {
  try {
    cache.flushAll();
    return true;
  } catch (err) {
    console.error('Erro ao limpar cache:', err);
    return false;
  }
};

/**
 * Obter estatísticas do cache
 */
const getStats = () => {
  return cache.getStats();
};

module.exports = {
  get,
  set,
  del,
  deleteByPrefix,
  flush,
  getStats
};
