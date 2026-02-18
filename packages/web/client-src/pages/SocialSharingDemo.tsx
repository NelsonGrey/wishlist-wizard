import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Share2, 
  Facebook, 
  Twitter, 
  Instagram, 
  Link as LinkIcon, 
  Copy, 
  Mail, 
  MessageCircle, 
  UserPlus,
  Check,
  Users,
  Gift
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import '@/styles/social-sharing.css';

// Define interfaces for mutation responses
interface InviteResponse {
  success: boolean;
  invitedCount: number;
}

interface JoinGroupResponse {
  success: boolean;
  name?: string;
}

// Mock wishlist data for our social sharing demo
const DEMO_WISHLISTS = [
  {
    id: 1,
    name: "Birthday Wishlist",
    description: "All the things I want for my upcoming birthday",
    shareId: "bday2024",
    itemCount: 12,
    occasion: "Birthday",
    occasionDate: new Date("2024-08-15"),
    isPublic: true,
    isCollaborative: false,
    imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmlydGhkYXl8ZW58MHx8MHx8fDA%3D"
  },
  {
    id: 2,
    name: "Wedding Registry",
    description: "Official wedding registry for our special day",
    shareId: "wedding2024",
    itemCount: 48,
    occasion: "Wedding",
    occasionDate: new Date("2024-06-22"),
    isPublic: true,
    isCollaborative: true,
    imageUrl: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fHdlZGRpbmd8ZW58MHx8MHx8fDA%3D"
  },
  {
    id: 3,
    name: "Holiday Wishlist",
    description: "Wishlist for the upcoming holiday season",
    shareId: "holidays2024",
    itemCount: 15,
    occasion: "Christmas",
    occasionDate: new Date("2024-12-25"),
    isPublic: true,
    isCollaborative: false,
    imageUrl: "https://images.unsplash.com/photo-1513297887119-d46091b24bfa?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTR8fGNocmlzdG1hc3xlbnwwfHwwfHx8MA%3D%3D"
  }
];

// Social platforms
const SOCIAL_PLATFORMS = [
  { id: "facebook", name: "Facebook", icon: <Facebook size={20} />, color: "bg-blue-600" },
  { id: "twitter", name: "Twitter", icon: <Twitter size={20} />, color: "bg-sky-500" },
  { id: "instagram", name: "Instagram", icon: <Instagram size={20} />, color: "bg-pink-600" },
  { id: "email", name: "Email", icon: <Mail size={20} />, color: "bg-red-500" },
  { id: "whatsapp", name: "WhatsApp", icon: <MessageCircle size={20} />, color: "bg-green-600" }
];

// Mock friends data
const SUGGESTED_FRIENDS = [
  { id: 1, name: "Alex Johnson", email: "alex.j@example.com", avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" },
  { id: 2, name: "Jamie Smith", email: "jamie.smith@example.com", avatar: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" },
  { id: 3, name: "Taylor Williams", email: "t.williams@example.com", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" },
  { id: 4, name: "Jordan Lee", email: "jordan.lee@example.com", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" },
  { id: 5, name: "Casey Miller", email: "c.miller@example.com", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" },
];

// Group gift organizers
const GROUP_GIFT_ORGANIZERS = [
  { id: 1, name: "Birthday Gift Pool", description: "Collecting for Alex's 30th birthday gift", members: 8, goal: 250, current: 180 },
  { id: 2, name: "Baby Shower Fund", description: "Group gift for Jamie's baby shower", members: 12, goal: 350, current: 320 },
  { id: 3, name: "Wedding Gift Collection", description: "Pooling money for Taylor & Jordan's wedding gift", members: 15, goal: 500, current: 275 },
];

const SocialSharingDemo = () => {
  const [selectedWishlist, setSelectedWishlist] = useState(DEMO_WISHLISTS[0]);
  const [shareMode, setShareMode] = useState<'public' | 'private' | 'group'>('public');
  const [shareUrl] = useState(`https://wishlistwizard.app/share/${selectedWishlist.shareId}`);
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
  const [customMessage, setCustomMessage] = useState(`Check out my "${selectedWishlist.name}" wishlist on Wishlist Wizard!`);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  
  const { toast } = useToast();

  // Simulate sharing to social media
  const { mutate: shareToSocial, isPending: isSharing } = useMutation({
    mutationFn: async ({ platform }: { platform: string }) => {
      // In a real app, this would make an API call
      return await new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, platform });
        }, 1000);
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Wishlist Shared!",
        description: `Your wishlist has been shared to ${variables.platform}.`,
        duration: 3000
      });
    }
  });

  // Simulate sending invites to friends
  const { mutate: inviteFriends, isPending: isInviting } = useMutation({
    mutationFn: async ({ friendIds }: { friendIds: number[] }) => {
      // In a real app, this would make an API call
      return await new Promise<InviteResponse>((resolve) => {
        setTimeout(() => {
          resolve({ success: true, invitedCount: friendIds.length });
        }, 1500);
      });
    },
    onSuccess: (data: InviteResponse) => {
      toast({
        title: "Invitations Sent!",
        description: `Sent ${data.invitedCount} invitation${data.invitedCount !== 1 ? 's' : ''} to your friends.`,
        duration: 3000
      });
      setSelectedFriends([]);
    }
  });

  // Simulate joining a group gift
  const { mutate: joinGroupGift } = useMutation({
    mutationFn: async ({ organizerId }: { organizerId: number }) => {
      // In a real app, this would make an API call
      return await new Promise<JoinGroupResponse>((resolve) => {
        setTimeout(() => {
          const organizer = GROUP_GIFT_ORGANIZERS.find(org => org.id === organizerId);
          resolve({ success: true, name: organizer?.name });
        }, 1000);
      });
    },
    onSuccess: (data: JoinGroupResponse) => {
      toast({
        title: "Joined Group Gift!",
        description: `You've successfully joined the "${data.name}" group gift.`,
        duration: 3000
      });
    }
  });

  // Copy share link to clipboard
  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link Copied!",
        description: "The share link has been copied to your clipboard.",
        duration: 3000
      });
    });
  };

  // Toggle friend selection
  const toggleFriendSelection = (friendId: number) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(selectedFriends.filter(id => id !== friendId));
    } else {
      setSelectedFriends([...selectedFriends, friendId]);
    }
  };

  // Get the appropriate sharing UI based on the mode
  const getSharingUI = () => {
    switch (shareMode) {
      case 'public':
        return (
          <div className="space-y-4">
            <div className="relative">
              <Input 
                value={shareUrl} 
                readOnly 
                className="pr-20"
              />
              <Button 
                size="sm" 
                variant="ghost" 
                className="absolute right-1 top-1 h-8" 
                onClick={copyShareLink}
              >
                <Copy size={16} className="mr-1" /> Copy
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-3 justify-center">
              {SOCIAL_PLATFORMS.map(platform => (
                <Button
                  key={platform.id}
                  variant="outline"
                  className={`h-12 w-12 rounded-full flex items-center justify-center p-0 hover:${platform.color} hover:text-white`}
                  onClick={() => shareToSocial({ platform: platform.name })}
                  disabled={isSharing}
                >
                  {platform.icon}
                </Button>
              ))}
            </div>

            <div className="border rounded-lg p-4 mt-4">
              <h3 className="text-sm font-medium mb-2">Customize Message</h3>
              <textarea 
                rows={3} 
                className="w-full border rounded-md p-2 text-sm"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personal message..."
              />
            </div>
          </div>
        );
      
      case 'private':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Invite Friends</h3>
            
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
              {SUGGESTED_FRIENDS.map(friend => (
                <div 
                  key={friend.id} 
                  className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                    selectedFriends.includes(friend.id) ? 'bg-primary/10 border border-primary/30' : ''
                  }`}
                  onClick={() => toggleFriendSelection(friend.id)}
                >
                  <div className="flex-shrink-0">
                    <img 
                      src={friend.avatar} 
                      alt={friend.name} 
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-sm">{friend.name}</p>
                    <p className="text-xs text-muted-foreground">{friend.email}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {selectedFriends.includes(friend.id) ? (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full border border-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">Personalized Invitation</h3>
              <textarea 
                rows={3} 
                className="w-full border rounded-md p-2 text-sm"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personal message..."
              />
            </div>
            
            <Button 
              className="w-full" 
              disabled={selectedFriends.length === 0 || isInviting}
              onClick={() => inviteFriends({ 
                friendIds: selectedFriends
              })}
            >
              {isInviting ? "Sending..." : "Send Invitations"}
            </Button>
          </div>
        );
      
      case 'group':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Group Gift Organizers</h3>
            
            <div className="space-y-3">
              {GROUP_GIFT_ORGANIZERS.map(organizer => (
                <Card key={organizer.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{organizer.name}</CardTitle>
                        <CardDescription>{organizer.description}</CardDescription>
                      </div>
                      <div className="bg-primary/10 text-primary font-medium px-2 py-1 rounded-full text-xs">
                        {organizer.members} members
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>${organizer.current} of ${organizer.goal}</span>
                        </div>
                        <div className="progress-bar-container">
                          <div 
                            className="group-gift-progress" 
                            style={{ width: `${(organizer.current / organizer.goal) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => joinGroupGift({ organizerId: organizer.id })}
                    >
                      <Gift size={16} className="mr-2" />
                      Join This Group Gift
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                toast({
                  title: "Create Group Gift",
                  description: "Group gift creation would launch a wizard here.",
                  duration: 3000
                });
              }}
            >
              Start a New Group Gift
            </Button>
          </div>
        );
    }
  };

  // Toggle collaborators panel
  const toggleCollaborators = () => {
    setShowCollaborators(!showCollaborators);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent mb-8 text-center">Social Sharing & Collaboration</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Wishlist Selection */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Select a Wishlist</CardTitle>
            <CardDescription>Choose a wishlist to share or collaborate on</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {DEMO_WISHLISTS.map(wishlist => (
              <div 
                key={wishlist.id} 
                className={`border rounded-lg cursor-pointer hover:border-primary transition-colors ${selectedWishlist.id === wishlist.id ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => setSelectedWishlist(wishlist)}
              >
                <div className="overflow-hidden h-32 rounded-t-lg">
                  <img 
                    src={wishlist.imageUrl} 
                    alt={wishlist.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-medium">{wishlist.name}</h3>
                  <p className="text-sm text-muted-foreground">{wishlist.itemCount} items</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {wishlist.occasion}
                    </span>
                    {wishlist.isCollaborative && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center">
                        <Users size={12} className="mr-1" /> Collaborative
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        {/* Sharing Options */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Share Your Wishlist</CardTitle>
                <CardDescription>Connect with friends and family</CardDescription>
              </div>
              <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex gap-2 items-center">
                    <Share2 size={16} />
                    Share Now
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Share &quot;{selectedWishlist.name}&quot;</DialogTitle>
                    <DialogDescription>
                      Choose how you&apos;d like to share your wishlist with others
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="flex flex-col space-y-4 py-4">
                    {getSharingUI()}
                  </div>
                  
                  <DialogFooter className="sm:justify-start">
                    <Button type="button" variant="secondary" onClick={() => setShareDialogOpen(false)}>
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Privacy & Sharing Settings */}
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Privacy Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="public-wishlist">Public Wishlist</Label>
                      <p className="text-sm text-muted-foreground">Anyone with the link can view</p>
                    </div>
                    <Switch 
                      id="public-wishlist" 
                      checked={selectedWishlist.isPublic}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="collaborative">Collaborative</Label>
                      <p className="text-sm text-muted-foreground">Allow others to add items</p>
                    </div>
                    <Switch 
                      id="collaborative" 
                      checked={selectedWishlist.isCollaborative}
                    />
                  </div>
                </div>
              </div>
              
              {/* Sharing Options */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Sharing Options</h3>
                <Tabs defaultValue="public" onValueChange={(value) => setShareMode(value as 'public' | 'private' | 'group')}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="public" className="flex gap-2 items-center">
                      <LinkIcon size={16} />
                      Public Link
                    </TabsTrigger>
                    <TabsTrigger value="private" className="flex gap-2 items-center">
                      <UserPlus size={16} />
                      Direct Invite
                    </TabsTrigger>
                    <TabsTrigger value="group" className="flex gap-2 items-center">
                      <Users size={16} />
                      Group Gifting
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="public" className="space-y-4 pt-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Public Link</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Share this link with anyone to let them view your wishlist. They won&apos;t need an account to view it.
                      </p>
                      <div className="flex gap-2">
                        <Input 
                          value={shareUrl} 
                          readOnly 
                          className="flex-grow"
                        />
                        <Button variant="outline" onClick={copyShareLink}>
                          <Copy size={16} className="mr-2" />
                          Copy
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Social Share</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Share directly to your favorite social platforms
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {SOCIAL_PLATFORMS.map(platform => (
                          <Button
                            key={platform.id}
                            variant="outline"
                            className="gap-2"
                            onClick={() => shareToSocial({ platform: platform.name })}
                          >
                            {platform.icon}
                            {platform.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="private" className="space-y-4 pt-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Direct Invitations</h4>
                      <p className="text-sm text-muted-foreground">
                        Send personal invitations to specific friends or family members. 
                        They&apos;ll receive an email with a link to your wishlist.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Invite Friends</h4>
                      <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                        {SUGGESTED_FRIENDS.map(friend => (
                          <div 
                            key={friend.id} 
                            className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                              selectedFriends.includes(friend.id) ? 'bg-primary/10 border border-primary/30' : ''
                            }`}
                            onClick={() => toggleFriendSelection(friend.id)}
                          >
                            <div className="flex-shrink-0">
                              <img 
                                src={friend.avatar} 
                                alt={friend.name} 
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            </div>
                            <div className="flex-grow">
                              <p className="font-medium text-sm">{friend.name}</p>
                              <p className="text-xs text-muted-foreground">{friend.email}</p>
                            </div>
                            <div className="flex-shrink-0">
                              {selectedFriends.includes(friend.id) ? (
                                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                  <Check size={12} className="text-white" />
                                </div>
                              ) : (
                                <div className="h-5 w-5 rounded-full border border-muted-foreground" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <Button 
                        className="w-full mt-4" 
                        disabled={selectedFriends.length === 0 || isInviting}
                        onClick={() => inviteFriends({ 
                          friendIds: selectedFriends
                        })}
                      >
                        {isInviting ? "Sending..." : `Invite ${selectedFriends.length} Friend${selectedFriends.length !== 1 ? 's' : ''}`}
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="group" className="space-y-4 pt-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Group Gifting</h4>
                      <p className="text-sm text-muted-foreground">
                        Organize group gifts with friends and family members to purchase more expensive items together.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium">Active Group Gifts</h4>
                      <div className="space-y-3">
                        {GROUP_GIFT_ORGANIZERS.map(organizer => (
                          <Card key={organizer.id} className="overflow-hidden">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-base">{organizer.name}</CardTitle>
                                  <CardDescription>{organizer.description}</CardDescription>
                                </div>
                                <div className="bg-primary/10 text-primary font-medium px-2 py-1 rounded-full text-xs">
                                  {organizer.members} members
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pb-2">
                              <div className="space-y-2">
                                <div>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span>Progress</span>
                                    <span>${organizer.current} of ${organizer.goal}</span>
                                  </div>
                                  <div className="progress-bar-container">
                                    <div 
                                      className="group-gift-progress" 
                                      style={{ width: `${(organizer.current / organizer.goal) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                            <CardFooter>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                                onClick={() => joinGroupGift({ organizerId: organizer.id })}
                              >
                                <Gift size={16} className="mr-2" />
                                Join This Group Gift
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              
              {/* Collaboration Features */}
              {selectedWishlist.isCollaborative && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Collaborators</h3>
                    <Button variant="outline" size="sm" onClick={toggleCollaborators}>
                      <Users size={16} className="mr-2" />
                      {showCollaborators ? "Hide Collaborators" : "Show Collaborators"}
                    </Button>
                  </div>
                  
                  {showCollaborators && (
                    <div className="border rounded-lg p-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {SUGGESTED_FRIENDS.slice(0, 4).map(friend => (
                          <div key={friend.id} className="flex items-center space-x-3 p-2 rounded-md border">
                            <div className="flex-shrink-0">
                              <img 
                                src={friend.avatar} 
                                alt={friend.name} 
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            </div>
                            <div className="flex-grow">
                              <p className="font-medium text-sm">{friend.name}</p>
                              <div className="flex items-center">
                                <span className="text-xs rounded-full px-2 py-0.5 bg-blue-100 text-blue-700">
                                  {friend.id === 1 ? "Owner" : "Editor"}
                                </span>
                                {friend.id === 2 && (
                                  <span className="text-xs text-muted-foreground ml-2">Added 3 items</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <Button size="sm" variant="outline" className="w-full">
                        <UserPlus size={16} className="mr-2" />
                        Invite More Collaborators
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => window.history.back()}>Back</Button>
            <Button onClick={() => setShareDialogOpen(true)}>
              <Share2 size={16} className="mr-2" />
              Share Wishlist
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">How Our Social Features Enhance Your Wishlist Experience</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Seamless Sharing</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Share your wishlists across all major social platforms with just a few clicks. 
                Friends and family can view your wishes without needing an account, making
                gift-giving easier than ever.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Collaborative Wishlists</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Create wishlists that multiple people can edit – perfect for family
                wish lists, roommate apartment furnishing, or any shared gifting occasion.
                Everyone can contribute ideas in one place.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Group Gifting</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Coordinate for bigger gifts by organizing group contributions.
                Our smart tracking system lets everyone see progress toward the goal
                and ensures no duplicate gifts or awkward money conversations.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SocialSharingDemo;