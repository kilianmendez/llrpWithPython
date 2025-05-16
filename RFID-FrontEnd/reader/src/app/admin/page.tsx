"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { API_GET_USERS, API_SET_USER_ADMIN } from "@/lib/config"
import { useUser } from "@/contexts/userContext"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AdminHeader } from "@/components/ui/components/admin-header"

interface User {
  id: number
  name: string
  email: string
  is_admin: boolean
}

export default function AdminPage() {
  const { user } = useUser()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  useEffect(() => {
    if (!user?.isAdmin) {
      router.push("/")
    } else {
      fetchUsers()
    }
  }, [user])

  const fetchUsers = async () => {
    try {
      const res = await axios.get(API_GET_USERS, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      })
      setUsers(res.data)
    } catch (err) {
      console.error("Error fetching users:", err)
    } finally {
      setLoading(false)
    }
  }

  const confirmRoleChange = async () => {
    if (!selectedUser) return
    try {
      await axios.put(
        API_SET_USER_ADMIN(selectedUser.id, !selectedUser.is_admin),
        {},
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
        }
      )
      setSelectedUser(null)
      fetchUsers()
    } catch (err) {
      console.error("Error updating user role:", err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 px-0 py-0">
      <AdminHeader />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">User Management</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted">Loading users...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={u.email === user?.email}
                          onClick={() => setSelectedUser(u)}
                        >
                          {u.is_admin ? "Admin" : "User"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              Change role for <span className="font-bold">{selectedUser.name}</span>?
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to make this user {selectedUser.is_admin ? "a regular user" : "an admin"}?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={confirmRoleChange}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
