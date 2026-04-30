import { useState } from "react";
import { 
  useListUsers, 
  getListUsersQueryKey,
  useAddProjectMember, 
  useUpdateProjectMember, 
  useRemoveProjectMember,
  getGetProjectQueryKey,
  getListProjectMembersQueryKey,
  ProjectDetail,
  ProjectRole
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Shield, ShieldAlert, Trash2, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ManageMembersProps {
  project: ProjectDetail;
  isAdmin: boolean;
}

export function ManageMembers({ project, isAdmin }: ManageMembersProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<ProjectRole>(ProjectRole.member);
  
  const { data: users = [] } = useListUsers({
    query: { enabled: isAddOpen, queryKey: getListUsersQueryKey() }
  });
  
  const addMember = useAddProjectMember();
  const updateMember = useUpdateProjectMember();
  const removeMember = useRemoveProjectMember();

  // Filter out existing members
  const availableUsers = users.filter(user => 
    !project.members.some(member => member.userId === user.id)
  );

  const handleAddMember = () => {
    if (!selectedUser) return;
    
    addMember.mutate(
      { projectId: project.id, data: { userId: selectedUser, role: selectedRole } },
      {
        onSuccess: () => {
          toast({ title: "Member added successfully" });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
          queryClient.invalidateQueries({ queryKey: getListProjectMembersQueryKey(project.id) });
          setIsAddOpen(false);
          setSelectedUser("");
        },
        onError: () => {
          toast({ title: "Failed to add member", variant: "destructive" });
        }
      }
    );
  };

  const handleUpdateRole = (memberId: string, role: ProjectRole) => {
    updateMember.mutate(
      { projectId: project.id, memberId, data: { role } },
      {
        onSuccess: () => {
          toast({ title: "Role updated" });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
        },
        onError: () => {
          toast({ title: "Failed to update role", variant: "destructive" });
        }
      }
    );
  };

  const handleRemoveMember = (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    
    removeMember.mutate(
      { projectId: project.id, memberId },
      {
        onSuccess: () => {
          toast({ title: "Member removed" });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
        },
        onError: () => {
          toast({ title: "Failed to remove member", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Team Members</h3>
          <p className="text-sm text-muted-foreground">
            Manage who has access to this project.
          </p>
        </div>
        
        {isAdmin && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Invite someone to collaborate on this project.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>User</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.length === 0 ? (
                        <SelectItem value="none" disabled>No users available</SelectItem>
                      ) : (
                        availableUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user.imageUrl || undefined} />
                                <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span>{user.name}</span>
                              <span className="text-muted-foreground text-xs ml-1">({user.email})</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as ProjectRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ProjectRole.member}>Member</SelectItem>
                      <SelectItem value={ProjectRole.admin}>Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleAddMember} 
                  disabled={!selectedUser || addMember.isPending}
                >
                  {addMember.isPending ? "Adding..." : "Add Member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {project.members.map(member => (
          <Card key={member.id} className="overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={member.user.imageUrl || undefined} />
                  <AvatarFallback>{member.user.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium leading-none">{member.user.name}</p>
                    {!isAdmin && (
                      <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-semibold ${member.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                        {member.role}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {member.user.email}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-xs text-muted-foreground hidden sm:block mr-2">
                  Joined {format(new Date(member.joinedAt), "MMM d, yyyy")}
                </div>
                
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <Select 
                      value={member.role} 
                      onValueChange={(val) => handleUpdateRole(member.id, val as ProjectRole)}
                      disabled={updateMember.isPending}
                    >
                      <SelectTrigger className="w-[110px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ProjectRole.member}>Member</SelectItem>
                        <SelectItem value={ProjectRole.admin}>Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removeMember.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
