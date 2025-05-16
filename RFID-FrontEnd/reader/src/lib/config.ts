const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
export { API_BASE_URL }

// Authentication
const API_LOGIN = `${API_BASE_URL}/token` // POST
export { API_LOGIN }
const API_REGISTER = `${API_BASE_URL}/register/` // POST
export { API_REGISTER }

//Users
const API_GET_USERS = `${API_BASE_URL}/users/` // GET
export { API_GET_USERS }

//Admin
export const API_SET_USER_ADMIN = (userId: number, makeAdmin: boolean) =>
    `${API_BASE_URL}/users/set-admin/${userId}?make_admin=${makeAdmin}`

// Products
export const API_GET_PRODUCTS = `${API_BASE_URL}/products/` // GET
export const API_POST_PRODUCT = `${API_BASE_URL}/products/upload/` // POST
export const API_UPDATE_PRODUCT = (productId: string) => `${API_BASE_URL}/products/update/${productId}` // PUT
export const API_DELETE_PRODUCT = (productId: number | string) => `${API_BASE_URL}/products/delete/${productId}` // DELETE


// Reader
const API_CONNECT_READER = `${API_BASE_URL}/connect` // POST
export { API_CONNECT_READER }
const API_DISCONNECT_READER = `${API_BASE_URL}/disconnect` // POST
export { API_DISCONNECT_READER }
const API_CONNECT_WEB_SOCKET = `${API_BASE_URL}/ws` // GET
export { API_CONNECT_WEB_SOCKET }
