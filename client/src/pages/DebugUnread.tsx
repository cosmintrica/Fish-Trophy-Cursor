import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function DebugUnread() {
    const { user } = useAuth();
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${msg}`]);

    const runDiagnostics = async () => {
        if (!user) {
            addLog('❌ No user logged in.');
            return;
        }

        setLoading(true);
        setLogs([]);
        addLog(`👤 User ID: ${user.id}`);

        try {
            // 1. Get a Subforum
            addLog('🔍 Fetching first subforum...');
            const { data: subforums, error: subError } = await supabase
                .from('forum_subforums')
                .select('id, name, category_id')
                .limit(1);

            if (subError || !subforums?.length) {
                addLog(`❌ Error fetching subforum: ${subError?.message || 'No subforums found'}`);
                setLoading(false);
                return;
            }

            const subforum = subforums[0];
            addLog(`📂 Subforum found: ${subforum.name} (${subforum.id})`);

            // 2. Check RPC
            addLog('⚡ Calling RPC: has_unread_topics_in_subforum...');
            const { data: rpcResult, error: rpcError } = await supabase.rpc('has_unread_topics_in_subforum', {
                p_user_id: user.id,
                p_subforum_id: subforum.id
            });

            if (rpcError) {
                addLog(`❌ RPC Error: ${rpcError.message}`);
            } else {
                addLog(`✅ RPC Result: ${rpcResult} (True = Unread, False = Read)`);
            }

            // 3. Check Manual Data
            addLog('📊 Checking Topics vs Read Status (Manual Query)...');

            // Get recent topics
            const { data: topics } = await supabase
                .from('forum_topics')
                .select('id, title, last_post_at')
                .eq('subforum_id', subforum.id)
                .order('last_post_at', { ascending: false })
                .limit(5);

            if (!topics?.length) {
                addLog('ℹ️ No topics in this subforum.');
            } else {
                for (const topic of topics) {
                    // Get read status for this topic
                    const { data: readOne } = await supabase
                        .from('forum_topic_reads')
                        .select('last_read_at')
                        .eq('user_id', user.id)
                        .eq('topic_id', topic.id)
                        .single();

                    const lastRead = readOne?.last_read_at || 'NEVER';
                    const isUnread = lastRead === 'NEVER' || new Date(topic.last_post_at) > new Date(lastRead);

                    addLog(`
            📄 Topic: ${topic.title.substring(0, 20)}...
               Last Post: ${topic.last_post_at}
               My Read:   ${lastRead}
               Calculated: ${isUnread ? '🔴 UNREAD' : '🟢 READ'}
          `);
                }
            }

        } catch (e: any) {
            addLog(`🔥 Exception: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-24 px-4 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-8 font-mono text-sm">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold mb-4">Debug Unread Status</h1>

                <div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200">
                    Această pagină rulează diagnostice live pe baza de date. ignoră erorile de SQL din consolă și uită-te aici.
                </div>

                <button
                    onClick={runDiagnostics}
                    disabled={!user || loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Running...' : 'Run Diagnostics'}
                </button>

                <div className="mt-6 space-y-2 bg-black text-green-400 p-4 rounded shadow-lg min-h-[300px] overflow-auto whitespace-pre-wrap">
                    {logs.length === 0 ? '// Ready to run...' : logs.map((log, i) => <div key={i}>{log}</div>)}
                </div>
            </div>
        </div>
    );
}
