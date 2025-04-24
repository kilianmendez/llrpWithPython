const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
export { API_BASE_URL }

const API_GET_PRODUCTS = `${API_BASE_URL}/products`
export { API_GET_PRODUCTS }

const API_GET_READINGS = `${API_BASE_URL}/readings`
export { API_GET_READINGS }

const API_POST_PRODUCT = `${API_BASE_URL}/products/upload`
export { API_POST_PRODUCT }

const API_DELETE_PRODUCT = `${API_BASE_URL}/products/delete`
export { API_DELETE_PRODUCT }

const API_CONNECT_READER = `${API_BASE_URL}/connect`
export { API_CONNECT_READER }

const API_DISCONNECT_READER = `${API_BASE_URL}/disconnect`
export { API_DISCONNECT_READER }


