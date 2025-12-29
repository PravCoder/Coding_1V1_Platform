import React, { useState } from 'react';
import api from "../api/axios";

function InviteLinkButton({ userID, is_explanation_match = false }) {
    // the string that holds the invite link 
    const [inviteLink, setInviteLink] = useState(null);
    const [loading, setLoading] = useState(false);
    // bool if the invite link has been copied or not yet
    const [copied, setCopied] = useState(false);

    const handleCreateInvite = async () => {
        setLoading(true);
        try {
            const response = await api.post(`/match/create-match-invite-link`, {
                userID: userID,
                is_explanation_match: is_explanation_match      // when they create invite which in turn creates a match they should 
            });

            setInviteLink(response.data.invite_link);
            console.log("Invite created:", response.data);
        } catch (error) {
            console.error("Error creating invite:", error);
            alert("Failed to create invite link");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div>
            {!inviteLink ? (
                <button 
                    onClick={handleCreateInvite}
                    disabled={loading}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#BF1922',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '16px'
                    }}
                >
                    {loading ? 'Creating match Link...' : 'Play with friend! Get match link!'}
                </button>
            ) : (
                <div style={{ 
                    border: '1px solid #ddd', 
                    padding: '15px', 
                    borderRadius: '5px',
                    backgroundColor: '#f9f9f9'
                }}>
                    <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>
                        Share this link with your friend:
                    </p>
                    <div style={{ 
                        display: 'flex', 
                        gap: '10px', 
                        alignItems: 'center',
                        backgroundColor: 'white',
                        padding: '10px',
                        borderRadius: '3px',
                        border: '1px solid #ccc'
                    }}>
                        <input 
                            type="text" 
                            value={inviteLink} 
                            readOnly
                            style={{
                                flex: 1,
                                border: 'none',
                                outline: 'none',
                                fontSize: '14px'
                            }}
                        />
                        <button 
                            onClick={handleCopyLink}
                            style={{
                                padding: '8px 15px',
                                backgroundColor: copied ? '#4CAF50' : '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            {copied ? '✓ Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InviteLinkButton;