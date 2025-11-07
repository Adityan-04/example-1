import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Source } from '../types';
import { generateStreamResponse, generateGraphData } from '../services/mockAiService';
import { ScaleIcon, SitemapIcon, SparklesIcon, ClipboardIcon, CheckIcon } from './icons';

interface KnowledgePanelProps {
    sources: Source[];
}

type Tab = 'insights' | 'graph' | 'compare';

const KnowledgePanel: React.FC<KnowledgePanelProps> = ({ sources }) => {
    const [activeTab, setActiveTab] = useState<Tab>('insights');

    const renderContent = () => {
        switch (activeTab) {
            case 'insights':
                return <InsightsContent sources={sources} />;
            case 'graph':
                return <KnowledgeGraph sources={sources} />;
            case 'compare':
                return <CompareContent sources={sources} />;
            default:
                return null;
        }
    };

    return (
        <div className="glassmorphism rounded-2xl h-full flex flex-col p-6 shadow-2xl">
            <div className="flex-shrink-0 flex border-b border-gray-700 mb-4">
                <TabButton icon={<SparklesIcon className="w-5 h-5"/>} label="Insights" isActive={activeTab === 'insights'} onClick={() => setActiveTab('insights')} />
                <TabButton icon={<SitemapIcon className="w-5 h-5"/>} label="Graph" isActive={activeTab === 'graph'} onClick={() => setActiveTab('graph')} />
                <TabButton icon={<ScaleIcon className="w-5 h-5"/>} label="Compare" isActive={activeTab === 'compare'} onClick={() => setActiveTab('compare')} />
            </div>
            <div className="flex-grow overflow-y-auto relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="h-full"
                    >
                        {renderContent()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

interface TabButtonProps {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}
const TabButton: React.FC<TabButtonProps> = ({ icon, label, isActive, onClick }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${isActive ? 'text-blue-400 border-blue-400' : 'text-gray-400 border-transparent hover:text-white'}`}>
        {icon}
        {label}
    </button>
);

const LoadingSpinner: React.FC = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-sm z-10">
        <div className="w-8 h-8 border-4 border-t-blue-500 border-gray-600 rounded-full animate-spin"></div>
    </div>
);

const InsightsContent: React.FC<{ sources: Source[] }> = ({ sources }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [summary, setSummary] = useState('');
    const [questions, setQuestions] = useState<string[]>([]);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleGenerateInsights = async () => {
        setIsLoading(true);
        setSummary('');
        setQuestions([]);
        const sourceNames = sources.map(s => s.name).join(', ');
        const prompt = `Generate insights for the following documents: ${sourceNames}`;
        
        try {
            let fullResponse = '';
            await generateStreamResponse(prompt, null, chunk => {
                fullResponse += chunk;
            }, new AbortController().signal);

            const [summaryPart, questionsPart] = fullResponse.split('###QUESTIONS###');
            setSummary(summaryPart.replace('###SUMMARY###', '').trim());
            setQuestions(questionsPart ? questionsPart.trim().split('\n').filter(q => q) : []);

        } catch (error) {
            console.error("Failed to generate insights:", error);
            setSummary("Sorry, an error occurred while generating insights.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {isLoading && <LoadingSpinner />}
            {!summary && !isLoading && (
                 <div className="flex-grow flex flex-col items-center justify-center text-center">
                    <SparklesIcon className="w-12 h-12 text-gray-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-300">Unlock Deeper Understanding</h3>
                    <p className="text-sm text-gray-500 max-w-xs">Generate an AI-powered summary and suggested questions based on your current knowledge base.</p>
                    <button onClick={handleGenerateInsights} disabled={isLoading || sources.length === 0} className="mt-6 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed">
                        Generate Insights
                    </button>
                </div>
            )}
            <AnimatePresence>
            {summary && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">Adaptive Summary</h3>
                        <p className="text-sm text-gray-400 bg-gray-900/40 p-3 rounded-lg">{summary}</p>
                    </div>
                    {questions.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-200 mb-2">Suggested Questions</h3>
                            <ul className="space-y-2">
                                {questions.map((q, i) => (
                                    <li key={i} className="flex items-center justify-between text-sm text-gray-300 bg-gray-900/40 p-3 rounded-lg group">
                                       <span>{q}</span>
                                       <button onClick={() => handleCopy(q, i)} className="text-gray-500 hover:text-white transition-opacity opacity-0 group-hover:opacity-100">
                                            {copiedIndex === i ? <CheckIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5" />}
                                       </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};

interface GraphData {
    nodes: { id: string; label: string; type: 'source' | 'entity' }[];
    links: { source: string; target: string; label: string }[];
}

const KnowledgeGraph: React.FC<{ sources: Source[] }> = ({ sources }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [graphData, setGraphData] = useState<GraphData | null>(null);

    const handleGenerateGraph = async () => {
        setIsLoading(true);
        setGraphData(null);
        const sourceNames = sources.map(s => s.name).join(', ');
        const prompt = `Create a knowledge graph for these documents: ${sourceNames}`;
        
        try {
            const data = await generateGraphData(prompt, new AbortController().signal);
            setGraphData(data);
        } catch (error) {
            console.error("Failed to generate graph:", error);
            // You could add an error message to the UI here
        } finally {
            setIsLoading(false);
        }
    };

    // Simple positioning logic for nodes
    const getNodePosition = (index: number, total: number) => {
        const angle = (index / total) * 2 * Math.PI;
        const radius = 120;
        const x = Math.cos(angle) * radius + 150;
        const y = Math.sin(angle) * radius + 100;
        return { x, y };
    };

    return (
        <div className="relative w-full h-full min-h-[400px] flex items-center justify-center">
            {isLoading && <LoadingSpinner />}
            {!graphData && !isLoading && (
                 <div className="text-center">
                    <SitemapIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-300">Visualize Connections</h3>
                    <p className="text-sm text-gray-500">Generate a knowledge graph to see how your documents and their key concepts relate.</p>
                    <button onClick={handleGenerateGraph} disabled={isLoading || sources.length === 0} className="mt-6 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed">
                        Generate Graph
                    </button>
                </div>
            )}
            {graphData && (
                <motion.svg className="w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {graphData.links.map((link, i) => {
                        const sourceNode = graphData.nodes.find(n => n.id === link.source);
                        const targetNode = graphData.nodes.find(n => n.id === link.target);
                        if (!sourceNode || !targetNode) return null;
                        const sourcePos = getNodePosition(graphData.nodes.indexOf(sourceNode), graphData.nodes.length);
                        const targetPos = getNodePosition(graphData.nodes.indexOf(targetNode), graphData.nodes.length);
                        return (
                            <g key={i}>
                                <line x1={sourcePos.x} y1={sourcePos.y} x2={targetPos.x} y2={targetPos.y} stroke="#4A5568" strokeWidth="1" />
                            </g>
                        );
                    })}
                    {graphData.nodes.map((node, i) => {
                        const { x, y } = getNodePosition(i, graphData.nodes.length);
                        const color = node.type === 'source' ? 'bg-purple-600' : 'bg-sky-600';
                        return (
                            <foreignObject key={node.id} x={x-50} y={y-16} width="100" height="40">
                                <div className={`p-2 text-white text-xs text-center rounded-lg shadow-lg ${color} truncate`}>
                                    {node.label}
                                </div>
                            </foreignObject>
                        );
                    })}
                </motion.svg>
            )}
        </div>
    );
};

const CompareContent: React.FC<{ sources: Source[] }> = ({ sources }) => {
    const [compareA, setCompareA] = useState<string>(sources[0]?.id || '');
    const [compareB, setCompareB] = useState<string>(sources[1]?.id || '');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState('');

    const handleCompare = async () => {
        const sourceA = sources.find(s => s.id === compareA);
        const sourceB = sources.find(s => s.id === compareB);
        if (!sourceA || !sourceB || sourceA.id === sourceB.id) {
            setResult("Please select two different sources to compare.");
            return;
        }
        setIsLoading(true);
        setResult('');
        const prompt = `Provide a side-by-side comparison of "${sourceA.name}" and "${sourceB.name}".`;
        try {
            let fullResponse = '';
            await generateStreamResponse(prompt, null, chunk => fullResponse += chunk, new AbortController().signal);
            setResult(fullResponse);
        } catch (error) {
            console.error("Failed to compare:", error);
            setResult("Sorry, an error occurred during comparison.");
        } finally {
            setIsLoading(false);
        }
    }
    
    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 grid grid-cols-2 gap-4 mb-4">
                <select value={compareA} onChange={e => setCompareA(e.target.value)} className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50" disabled={sources.length < 1}>
                    {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={compareB} onChange={e => setCompareB(e.target.value)} className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50" disabled={sources.length < 2}>
                    {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
             <div className="flex-shrink-0 mb-4">
                <button onClick={handleCompare} disabled={isLoading || sources.length < 2 || compareA === compareB} className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? 'Comparing...' : 'Compare'}
                </button>
            </div>
            <div className="flex-grow overflow-y-auto relative bg-gray-900/40 p-3 rounded-lg">
                {isLoading && <LoadingSpinner />}
                {!result && !isLoading && (
                    <div className="text-center text-sm text-gray-500 flex items-center justify-center h-full">
                        <p>Select two documents and click compare to see the AI-powered analysis.</p>
                    </div>
                )}
                {result && <p className="text-sm text-gray-300 whitespace-pre-wrap">{result}</p>}
            </div>
        </div>
    );
};


export default KnowledgePanel;