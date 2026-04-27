import { useState } from "react"
import { Copy, Sparkles } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import { Button, Input, Modal } from "../ui/core"

interface RoomJoinModalProps {
  open: boolean
  onClose: () => void
  onJoin: (payload: { username: string; roomId: string }) => Promise<void>
}

const RoomJoinModal = ({ open, onClose, onJoin }: RoomJoinModalProps) => {
  const [username, setUsername] = useState("")
  const [roomId, setRoomId] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const generateRoomId = () => {
    const id = uuidv4()
    setRoomId(id)
    void navigator.clipboard.writeText(id)
  }

  const handleJoin = async () => {
    setErrorMessage(null)
    setSuccess(false)

    if (username.trim().length < 3) {
      setErrorMessage("Username must be at least 3 characters")
      return
    }

    if (roomId.trim().length < 5) {
      setErrorMessage("Room ID must be at least 5 characters")
      return
    }

    setIsJoining(true)
    try {
      await onJoin({ username: username.trim(), roomId: roomId.trim() })
      setSuccess(true)
      onClose()
    } catch (error: any) {
      setErrorMessage(error?.message ?? "Failed to join room")
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Join Or Create Room"
      description="Collaborate in real time by joining an existing room or creating a new one."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={isJoining} onClick={handleJoin}>
            Join Room
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input label="Username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Ada Lovelace" />
        <Input
          label="Room ID"
          value={roomId}
          onChange={(event) => setRoomId(event.target.value)}
          placeholder="Enter room id"
          iconRight={
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(roomId)}
              aria-label="Copy room id"
              title="Copy room id"
            >
              <Copy size={14} />
            </button>
          }
        />

        <Button variant="secondary" className="w-full" iconLeft={<Sparkles size={14} />} onClick={generateRoomId}>
          Generate Unique Room ID
        </Button>

        {errorMessage ? <p className="animate-shake text-sm text-red-400">{errorMessage}</p> : null}
        {success ? <p className="text-sm text-emerald-400">Joined successfully.</p> : null}
      </div>
    </Modal>
  )
}

export { RoomJoinModal }
